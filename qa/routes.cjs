#!/usr/bin/env node
/**
 * Prints every route the API serves, one "METHOD /path" per line.
 * Run from the repo root: node qa/routes.cjs
 * It loads the Express routers without starting the server or a database.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'route-listing-only';
const fs = require('fs');
const path = require('path');

const backend = path.join(__dirname, '..', 'backend', 'src');
const server = fs.readFileSync(path.join(backend, 'server.js'), 'utf8');
const out = new Set();

// app.use('/api/v1/x', require('./routes/x'))  and  const x = require(...); app.use('/api/v1/x', x)
const mounts = [];
for (const m of server.matchAll(/app\.use\(\s*['"`]([^'"`]+)['"`]\s*,[^;]*?require\(['"](\.\/routes\/[^'"]+)['"]\)/g)) mounts.push([m[1], m[2]]);
const named = {};
for (const m of server.matchAll(/const (\w+) = require\(['"](\.\/routes\/[^'"]+)['"]\)/g)) named[m[1]] = m[2];
for (const m of server.matchAll(/app\.use\(\s*['"`]([^'"`]+)['"`]\s*,[^;]*?\b(\w+)\s*\)\s*;/g)) if (named[m[2]]) mounts.push([m[1], named[m[2]]]);

function walk(prefix, router) {
  for (const layer of router.stack || []) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) out.add(`${method.toUpperCase()} ${prefix}${layer.route.path}`);
    } else if (layer.handle && layer.handle.stack) {
      const src = layer.regexp && layer.regexp.source;
      let sub = '';
      const m = src && src.match(/^\^\\\/(.+?)\\\/\?\(\?=\\\/\|\$\)$/);
      if (m) sub = '/' + m[1].replace(/\\\//g, '/').replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param');
      walk(prefix + sub, layer.handle);
    }
  }
}

const seen = new Set();
for (const [prefix, file] of mounts) {
  if (seen.has(prefix + file)) continue;
  seen.add(prefix + file);
  const mod = require(path.join(backend, file));
  walk(prefix, mod.router || mod);
}

// Sub-routers mounted through a wrapper function cannot be walked; read them.
const hostAppDir = path.join(backend, 'routes', 'hostApp');
for (const file of fs.readdirSync(hostAppDir)) {
  const text = fs.readFileSync(path.join(hostAppDir, file), 'utf8');
  for (const m of text.matchAll(/router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)/g)) out.add(`${m[1].toUpperCase()} /api/v1/host${m[2]}`);
}

console.log([...out].sort().join('\n'));
