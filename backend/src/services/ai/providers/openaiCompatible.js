/**
 * Any provider that speaks the OpenAI Chat Completions format (OpenAI, Azure
 * OpenAI, Groq, a local Ollama, ...). The assistant stores conversations in
 * Anthropic's block shape; this adapter translates both ways.
 */

function toOpenAiMessages(system, messages) {
  const out = [{ role: 'system', content: system }];
  for (const m of messages) {
    const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content;
    if (m.role === 'user') {
      const text = [];
      for (const b of blocks) {
        if (b.type === 'tool_result') {
          out.push({
            role: 'tool',
            tool_call_id: b.tool_use_id,
            content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content),
          });
        } else if (b.type === 'text') {
          text.push(b.text);
        }
      }
      if (text.length) out.push({ role: 'user', content: text.join('\n\n') });
    } else {
      const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n\n');
      const toolCalls = blocks.filter((b) => b.type === 'tool_use').map((b) => ({
        id: b.id,
        type: 'function',
        function: { name: b.name, arguments: JSON.stringify(b.input || {}) },
      }));
      const msg = { role: 'assistant', content: text || null };
      if (toolCalls.length) msg.tool_calls = toolCalls;
      out.push(msg);
    }
  }
  return out;
}

function toOpenAiTools(tools) {
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

class ProviderError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function complete({ settings, system, tools, messages, maxTokens = 4096 }) {
  const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90 * 1000);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: maxTokens,
        messages: toOpenAiMessages(system, messages),
        tools: tools.length ? toOpenAiTools(tools) : undefined,
      }),
    });
  } catch (e) {
    throw new ProviderError(`connection failed: ${e.message}`, 0);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new ProviderError(`provider returned ${res.status}`, res.status);

  const data = await res.json();
  const choice = (data.choices && data.choices[0]) || {};
  const msg = choice.message || {};
  const content = [];
  if (msg.content) content.push({ type: 'text', text: msg.content });
  for (const call of msg.tool_calls || []) {
    let input = {};
    try { input = JSON.parse(call.function.arguments || '{}'); } catch (e) { input = { _invalid_json: true }; }
    content.push({ type: 'tool_use', id: call.id, name: call.function.name, input });
  }
  const stopReason = choice.finish_reason === 'tool_calls' || (msg.tool_calls && msg.tool_calls.length)
    ? 'tool_use'
    : choice.finish_reason === 'length' ? 'max_tokens'
      : choice.finish_reason === 'content_filter' ? 'refusal' : 'end_turn';

  return {
    content,
    stopReason,
    model: data.model || settings.model,
    usage: {
      input: (data.usage && data.usage.prompt_tokens) || 0,
      output: (data.usage && data.usage.completion_tokens) || 0,
    },
  };
}

function classifyError(err) {
  const s = err && err.status;
  if (s === 401 || s === 403) return 'auth';
  if (s === 429) return 'rate_limited';
  if (s === 400 || s === 404) return 'bad_request';
  if (s === 0 || s >= 500) return 'unavailable';
  return 'unknown';
}

module.exports = { complete, classifyError, toOpenAiMessages };
