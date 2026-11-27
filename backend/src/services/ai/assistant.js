/**
 * The assistant loop: send the conversation to the configured model, run the
 * read-only tools it asks for, turn write tools into pending actions that the
 * user must confirm, and stop when the model answers.
 */
const AiAction = require('../../models/AiAction');
const logger = require('../../config/logger');
const { getProvider } = require('./providers');
const { systemPrompt } = require('./prompts');
const { toolsFor, findTool, definitions } = require('./tools');
const { ToolError } = require('./tools/common');

const MAX_STEPS = 8;
const ACTION_TTL_MS = 24 * 3600 * 1000;
const MAX_TOOL_RESULT_CHARS = 12000;

function toolResultText(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > MAX_TOOL_RESULT_CHARS ? `${text.slice(0, MAX_TOOL_RESULT_CHARS)}… (truncated)` : text;
}

function textOf(content) {
  return (content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n\n').trim();
}

/**
 * Run one user turn. Mutates `conversation` (appends messages, usage) but does
 * not save it; the caller saves.
 * Returns { reply, actions, toolsUsed, stopReason }.
 */
async function runTurn({ conversation, ctx, settings, userText }) {
  const provider = getProvider(settings.provider);
  const tools = toolsFor(ctx);
  const toolDefs = definitions(tools);
  const system = systemPrompt(ctx.role, settings.extraInstructions);

  // The date and any notes about confirmed/rejected actions travel with the
  // user's message so earlier history stays untouched.
  const today = new Date().toISOString().slice(0, 10);
  const blocks = [];
  const notes = conversation.pendingNotes || [];
  if (notes.length) blocks.push({ type: 'text', text: `[ملاحظات النظام]\n${notes.join('\n')}` });
  blocks.push({ type: 'text', text: `[تاريخ اليوم: ${today}]\n${userText}` });
  conversation.messages.push({ role: 'user', content: blocks });
  conversation.pendingNotes = [];

  const actions = [];
  const toolsUsed = [];
  let reply = '';
  let stopReason = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await provider.complete({
      settings,
      system,
      tools: toolDefs,
      messages: conversation.messages,
    });
    conversation.usage.inputTokens += res.usage.input;
    conversation.usage.outputTokens += res.usage.output;
    conversation.lastModel = res.model;
    conversation.lastProvider = settings.provider;
    conversation.messages.push({ role: 'assistant', content: res.content });
    stopReason = res.stopReason;

    const text = textOf(res.content);
    if (text) reply = text;

    if (res.stopReason === 'pause_turn') continue;
    if (res.stopReason !== 'tool_use') break;

    const results = [];
    for (const call of res.content.filter((b) => b.type === 'tool_use')) {
      toolsUsed.push(call.name);
      const tool = findTool(call.name, ctx);
      if (!tool) {
        results.push({ type: 'tool_result', tool_use_id: call.id, is_error: true, content: 'هذه الأداة غير متاحة لهذا المستخدم.' });
        continue;
      }
      const input = call.input && typeof call.input === 'object' ? call.input : {};
      try {
        if (tool.write) {
          const summary = tool.describe ? await tool.describe(input, ctx) : tool.name;
          const action = await AiAction.create({
            conversation: conversation._id,
            user: ctx.user._id,
            userType: conversation.userType,
            tool: tool.name,
            input,
            summary,
            expiresAt: new Date(Date.now() + ACTION_TTL_MS),
          });
          actions.push({ id: String(action._id), tool: tool.name, summary, status: 'pending' });
          results.push({
            type: 'tool_result',
            tool_use_id: call.id,
            content: `تم تجهيز الإجراء (رقم ${action._id}) وهو الآن بانتظار تأكيد المستخدم بالزر. لم يُنفّذ بعد.`,
          });
        } else {
          const value = await tool.run(input, ctx);
          results.push({ type: 'tool_result', tool_use_id: call.id, content: toolResultText(value) });
        }
      } catch (err) {
        const message = err instanceof ToolError ? err.message : 'تعذّر تنفيذ الأداة.';
        if (!(err instanceof ToolError)) logger.error('AI tool failed', { tool: call.name, error: err.message });
        results.push({ type: 'tool_result', tool_use_id: call.id, is_error: true, content: message });
      }
    }
    conversation.messages.push({ role: 'user', content: results });

    if (step === MAX_STEPS - 1) stopReason = 'max_steps';
  }

  if (!reply || stopReason === 'max_steps' || stopReason === 'tool_use') {
    reply = reply || 'ما قدرت أكمل الطلب هذي المرة. جرّب تعيد صياغته أو تقسمه لأسئلة أصغر.';
  }
  if (stopReason === 'refusal') reply = 'ما أقدر أساعد في هذا الطلب.';
  if (stopReason === 'max_tokens') reply = `${reply}\n\n(الرد طويل وانقطع. اطلب مني أكمل.)`;

  conversation.usage.turns += 1;
  return { reply, actions, toolsUsed, stopReason };
}

/**
 * Execute or reject a pending action. The tool is looked up again with the
 * user's CURRENT permissions, so a role removed since the proposal blocks it.
 */
async function decideAction({ action, ctx, approve }) {
  if (action.status !== 'pending') return action;
  if (action.expiresAt < new Date()) {
    action.status = 'expired';
    action.decidedAt = new Date();
    await action.save();
    return action;
  }
  action.decidedAt = new Date();
  if (!approve) {
    action.status = 'rejected';
    await action.save();
    return action;
  }
  const tool = findTool(action.tool, ctx);
  if (!tool || !tool.write) {
    action.status = 'failed';
    action.error = 'لم تعد تملك صلاحية هذا الإجراء';
    await action.save();
    return action;
  }
  // Claim it first so a double click cannot run it twice.
  const claimed = await AiAction.findOneAndUpdate(
    { _id: action._id, status: 'pending' },
    { $set: { status: 'executed', decidedAt: action.decidedAt } },
    { new: true }
  );
  if (!claimed) return AiAction.findById(action._id);
  try {
    claimed.result = await tool.run(claimed.input || {}, ctx);
  } catch (err) {
    claimed.status = 'failed';
    claimed.error = err instanceof ToolError ? err.message : 'تعذّر تنفيذ الإجراء';
    if (!(err instanceof ToolError)) logger.error('AI action failed', { tool: claimed.tool, error: err.message });
  }
  await claimed.save();
  return claimed;
}

module.exports = { runTurn, decideAction, textOf };
