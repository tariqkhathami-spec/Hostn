const anthropic = require('./anthropic');
const openaiCompatible = require('./openaiCompatible');

const PROVIDERS = { anthropic, openai_compatible: openaiCompatible };

function getProvider(name) {
  return PROVIDERS[name] || anthropic;
}

module.exports = { getProvider };
