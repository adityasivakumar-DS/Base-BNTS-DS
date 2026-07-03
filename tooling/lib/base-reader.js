/**
 * base-reader.js — single source of truth reader for the base design system.
 *
 * Everything downstream (the MCP AI doorway and the brand generator) reads the
 * base system through this module so there is exactly ONE definition of "what the
 * base is." It never writes; it only reads the committed base repo.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Absolute path to the base repo root (parent of tooling/). */
export const BASE_ROOT = resolve(__dirname, '..', '..');

const TIERS = ['core', 'semantic', 'base'];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Read every token file in a tier, keyed by file stem (e.g. "color", "radius"). */
export function readTier(tier) {
  const dir = join(BASE_ROOT, 'tokens', tier);
  if (!existsSync(dir)) return {};
  const out = {};
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    out[file.replace(/\.json$/, '')] = readJson(join(dir, file));
  }
  return out;
}

/** All three tiers of DTCG tokens as { core, semantic, base }. */
export function readAllTiers() {
  return Object.fromEntries(TIERS.map((t) => [t, readTier(t)]));
}

/** Flatten a DTCG token object into { "a.b.c": {value,type,description} } leaves. */
export function flattenTokens(obj, prefix = '', acc = {}) {
  for (const [key, node] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (node && typeof node === 'object' && '$value' in node) {
      acc[path] = {
        value: node.$value,
        type: node.$type,
        description: node.$description,
      };
    } else if (node && typeof node === 'object') {
      flattenTokens(node, path, acc);
    }
  }
  return acc;
}

/** Flat map of every token path -> leaf across one tier's files. */
export function flatTier(tier) {
  const files = readTier(tier);
  const acc = {};
  for (const doc of Object.values(files)) flattenTokens(doc, '', acc);
  return acc;
}

/** The list of headless components shipped by the base system. */
export function listComponents() {
  const dir = join(BASE_ROOT, 'components');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isDirectory())
    .sort()
    .map((name) => {
      const cssPath = join(dir, name, `${name}.css`);
      const tokens = existsSync(cssPath) ? consumedTokens(readFileSync(cssPath, 'utf8')) : [];
      return { name, css: `components/${name}/${name}.css`, tokensConsumed: tokens };
    });
}

/** Pull the --ds-* custom properties a component's CSS consumes. */
export function consumedTokens(css) {
  const set = new Set();
  const re = /var\(\s*(--ds-[a-z0-9-]+)/gi;
  let m;
  while ((m = re.exec(css))) set.add(m[1]);
  return [...set].sort();
}

/**
 * Base parameters for one component (or all): the base-tier token roles it can
 * pick from. e.g. component "button" -> action.primary.*, action.secondary.* ...
 */
export function baseParameters(component) {
  const base = flatTier('base');
  if (!component) return base;
  // Map a component name to the base-tier namespaces it draws from.
  const NS = {
    button: ['action.'],
    input: ['form.field.'],
    textarea: ['form.field.'],
    checkbox: ['form.field.', 'action.'],
    radio: ['form.field.', 'action.'],
    switch: ['form.field.', 'action.'],
    card: ['surface.'],
    modal: ['surface.', 'action.'],
    drawer: ['surface.'],
    alert: ['feedback.'],
    toast: ['feedback.'],
    badge: ['feedback.', 'action.'],
  };
  const prefixes = NS[component] || [];
  if (!prefixes.length) return base; // unknown component -> return everything
  return Object.fromEntries(
    Object.entries(base).filter(([p]) => prefixes.some((pre) => p.startsWith(pre))),
  );
}

/** Load a JSON rules file from tooling/rules/. */
export function readRules(name) {
  return readJson(join(__dirname, '..', 'rules', `${name}.json`));
}

/** Load a text/markdown rules doc from tooling/rules/. */
export function readRulesDoc(name) {
  return readFileSync(join(__dirname, '..', 'rules', name), 'utf8');
}

/** The base system version, from the base repo package.json. */
export function baseVersion() {
  return readJson(join(BASE_ROOT, 'package.json')).version;
}
