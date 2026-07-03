import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { COMPONENTS_DIR } from './tokenStore.js';

export function listComponentNames() {
  return readdirSync(COMPONENTS_DIR)
    .filter((entry) => statSync(path.join(COMPONENTS_DIR, entry)).isDirectory())
    .sort();
}

export function extractCssVars(cssContent) {
  const matches = cssContent.match(/--ds-[a-z0-9-]+/g) || [];
  return [...new Set(matches)].sort();
}

/**
 * Reads every component's CSS directly (never hand-maintained) so the manifest can never drift
 * from what the components actually consume.
 */
export function getComponentManifest(cssVarIndex) {
  return listComponentNames().map((name) => {
    const cssPath = path.join(COMPONENTS_DIR, name, `${name}.css`);
    const htmlPath = path.join(COMPONENTS_DIR, name, `${name}.html`);

    let cssVars = [];
    try {
      cssVars = extractCssVars(readFileSync(cssPath, 'utf8'));
    } catch {
      cssVars = [];
    }

    const tokensConsumed = cssVars.map((cssVar) => {
      const resolved = cssVarIndex?.get(cssVar);
      return {
        cssVar,
        tokenPath: resolved?.path ?? null,
        tier: resolved?.tier ?? 'unresolved',
        type: resolved?.type ?? null,
        resolvedValue: resolved?.resolvedValue ?? null,
      };
    });

    return {
      name,
      cssFile: path.relative(path.join(COMPONENTS_DIR, '..'), cssPath),
      htmlFile: path.relative(path.join(COMPONENTS_DIR, '..'), htmlPath),
      tokensConsumed,
    };
  });
}
