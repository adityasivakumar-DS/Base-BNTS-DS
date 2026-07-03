import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(__dirname, '../..');
export const TOKENS_DIR = path.join(REPO_ROOT, 'tokens');
export const COMPONENTS_DIR = path.join(REPO_ROOT, 'components');

const TIERS = ['core', 'semantic', 'base'];

function readJsonFilesRecursive(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...readJsonFilesRecursive(full));
    } else if (entry.endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

function isTokenNode(node) {
  return !!node && typeof node === 'object' && '$value' in node;
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (key.startsWith('$')) continue;
    const sourceVal = source[key];
    if (!isTokenNode(sourceVal) && sourceVal && typeof sourceVal === 'object') {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      deepMerge(target[key], sourceVal);
    } else {
      target[key] = sourceVal;
    }
  }
  return target;
}

/** Loads one tier (core|semantic|base) as a raw DTCG tree, merged across every JSON file in it. */
export function loadTier(tierName) {
  const dir = path.join(TOKENS_DIR, tierName);
  const tree = {};
  for (const file of readJsonFilesRecursive(dir)) {
    deepMerge(tree, JSON.parse(readFileSync(file, 'utf8')));
  }
  return tree;
}

/** Loads all three tiers as raw DTCG trees. */
export function loadAllTiers() {
  const tiers = {};
  for (const tier of TIERS) tiers[tier] = loadTier(tier);
  return tiers;
}

/** Flattens a DTCG tree into a list of { path, value, type, description }. */
export function flatten(tree, prefix = [], out = []) {
  for (const [key, node] of Object.entries(tree)) {
    if (key.startsWith('$')) continue;
    const nextPrefix = [...prefix, key];
    if (isTokenNode(node)) {
      out.push({
        path: nextPrefix.join('.'),
        value: node.$value,
        type: node.$type,
        description: node.$description,
      });
    } else if (node && typeof node === 'object') {
      flatten(node, nextPrefix, out);
    }
  }
  return out;
}

function resolveValue(rawValue, lookup, seen) {
  if (typeof rawValue !== 'string') return rawValue;
  const match = rawValue.match(/^\{([^}]+)\}$/);
  if (!match) return rawValue;
  const refPath = match[1];
  if (seen.has(refPath)) return rawValue;
  const found = lookup.get(refPath);
  if (!found) return rawValue;
  return resolveValue(found.value, lookup, new Set(seen).add(refPath));
}

/**
 * Flattens + resolves alias references ({core.path} -> literal value) across all tiers.
 * Returns { core: [...], semantic: [...], base: [...] }, each entry augmented with resolvedValue.
 */
export function resolveAll(tiers) {
  const flatByTier = {};
  for (const tier of TIERS) flatByTier[tier] = flatten(tiers[tier]);

  const lookup = new Map();
  for (const tier of TIERS) {
    for (const token of flatByTier[tier]) lookup.set(token.path, token);
  }

  const resolved = {};
  for (const tier of TIERS) {
    resolved[tier] = flatByTier[tier].map((token) => ({
      ...token,
      resolvedValue: resolveValue(token.value, lookup, new Set()),
    }));
  }
  return resolved;
}

/** Builds a map of generated CSS custom property name -> resolved token, e.g. "--ds-action-primary-bg" -> {...}. */
export function buildCssVarIndex(resolvedTiers) {
  const index = new Map();
  for (const tier of TIERS) {
    for (const token of resolvedTiers[tier]) {
      const cssVar = `--ds-${token.path.replace(/\./g, '-')}`;
      index.set(cssVar, { tier, ...token });
    }
  }
  return index;
}

export function loadResolvedTokens() {
  const raw = loadAllTiers();
  const resolved = resolveAll(raw);
  const cssVarIndex = buildCssVarIndex(resolved);
  return { raw, resolved, cssVarIndex };
}
