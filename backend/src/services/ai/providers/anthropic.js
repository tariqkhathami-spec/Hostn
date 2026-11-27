/**
 * Claude provider (official Anthropic SDK).
 * Messages are kept in Anthropic's own shape throughout the assistant, so this
 * adapter passes them through unchanged (thinking blocks included: they must be
 * echoed back as received).
 */
const Anthropic = require('@anthropic-ai/sdk');

// Models that accept the server-side refusal fallback ("default" routing).
const FALLBACK_MODELS = new Set([
  'claude-fable-5-2', 'claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5',
]);
// Models that take output_config.effort.
const NO_EFFORT = /^claude-(haiku-4-5|sonnet-4-5|3)/;

const clients = new Map();
function clientFor(apiKey, baseUrl) {
  const cacheKey = `${apiKey}|${baseUrl || ''}`;
  if (!clients.has(cacheKey)) {
    clients.clear(); // only ever one active key
    clients.set(cacheKey, new Anthropic({
      apiKey,
      baseURL: baseUrl || undefined,
      timeout: 90 * 1000,
      maxRetries: 2,
    }));
  }
  return clients.get(cacheKey);
}

async function complete({ settings, system, tools, messages, maxTokens = 4096 }) {
  const client = clientFor(settings.apiKey, null);
  const params = {
    model: settings.model,
    max_tokens: maxTokens,
    // The system prompt and tool list are stable per role, so cache them.
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    tools,
    messages,
  };
  if (!NO_EFFORT.test(settings.model)) params.output_config = { effort: settings.effort };

  let response;
  if (FALLBACK_MODELS.has(settings.model)) {
    response = await client.beta.messages.create({
      ...params,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
  } else {
    response = await client.messages.create(params);
  }

  return {
    // Plain JSON so it can be stored in Mongo and sent back verbatim.
    content: JSON.parse(JSON.stringify(response.content)),
    stopReason: response.stop_reason,
    model: response.model,
    usage: {
      input: (response.usage.input_tokens || 0)
        + (response.usage.cache_read_input_tokens || 0)
        + (response.usage.cache_creation_input_tokens || 0),
      output: response.usage.output_tokens || 0,
    },
  };
}

/** Map SDK errors to a short reason the assistant can act on. */
function classifyError(err) {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return 'auth';
  if (err instanceof Anthropic.RateLimitError) return 'rate_limited';
  if (err instanceof Anthropic.BadRequestError || err instanceof Anthropic.NotFoundError) return 'bad_request';
  if (err instanceof Anthropic.APIConnectionError) return 'unavailable';
  if (err instanceof Anthropic.APIError && err.status >= 500) return 'unavailable';
  return 'unknown';
}

module.exports = { complete, classifyError };
