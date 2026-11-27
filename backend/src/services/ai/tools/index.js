/**
 * Tool registry. Which tools a user gets is decided here, on the server, from
 * the authenticated account; the model never chooses its own role.
 */
const { hasPermission } = require('../../../config/permissions');
const adminTools = require('./admin');
const guestTools = require('./guest');
const hostTools = require('./host');
const supportTools = require('./support');

const BY_ROLE = {
  admin: adminTools,
  guest: [...guestTools, ...supportTools],
  host: [...hostTools, ...supportTools],
};

function allowed(tool, ctx) {
  if (!tool.permission) return true;
  return hasPermission(ctx.user, tool.permission);
}

/** Tools this user may use right now. */
function toolsFor(ctx) {
  return (BY_ROLE[ctx.role] || []).filter((t) => allowed(t, ctx));
}

/** Look a tool up for this user; null when it is not theirs to call. */
function findTool(name, ctx) {
  return toolsFor(ctx).find((t) => t.name === name) || null;
}

/** Provider-facing definitions (no handlers). */
function definitions(tools) {
  return tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
}

module.exports = { toolsFor, findTool, definitions };
