/**
 * generate.js — scaffold a brand design system into its OWN repo.
 *
 * The parametric thesis in code: a brand === the base with a new CORE tier.
 * So generation is:
 *   - copy the base `semantic`, `base`, and `components` UNCHANGED (structure)
 *   - write a new `core` tier from the approved mapping (the brand's values)
 *   - add the brand's own Storybook + Figma library + provenance
 *   - never write a single byte into the base repo
 */
import { cpSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { BASE_ROOT, readTier, baseVersion } from '../../lib/base-reader.js';
import { generateRamp } from '../../lib/color.js';

export function generateBrand({ profile, result, targetDir, stampISO }) {
  const target = resolve(targetDir);
  assertOutsideBase(target);

  const written = [];
  const write = (rel, content) => {
    const full = join(target, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
    written.push(rel);
  };
  const copy = (rel) => {
    const src = join(BASE_ROOT, rel);
    if (!existsSync(src)) return;
    cpSync(src, join(target, rel), { recursive: true });
    written.push(`${rel} (copied from base, unchanged)`);
  };

  // 1. Inherit structure from the base, unchanged.
  copy('components');
  copy('tokens/semantic');
  copy('tokens/base');
  copy('style-dictionary.config.js');

  // 2. Write the brand's CORE tier from the approved mapping.
  const provenance = provenanceIndex(result.mappings);
  const coreFiles = readTier('core');
  for (const [stem, doc] of Object.entries(coreFiles)) {
    const cloned = structuredClone(doc);
    let touched = 0;
    for (const [path, value] of Object.entries(result.overrides)) {
      if (value === '(inherited)') continue;
      if (setLeaf(cloned, path, value, provenance[path])) touched++;
    }
    cloned.$description = `${profile.brandName} brand — core tier. ${touched} value(s) overridden from the base via the ${profile.brandName} Figma file; the rest inherited from Base BNTS DS v${baseVersion()}.`;
    write(`tokens/core/${stem}.json`, JSON.stringify(cloned, null, 2) + '\n');
  }

  // 3. Brand repo scaffolding.
  write('package.json', brandPackageJson(profile));
  write('.gitignore', 'node_modules/\nbuild/\n*.log\n.DS_Store\n');
  write('README.md', brandReadme(profile, result));
  write('brand.config.json', JSON.stringify(brandConfig(profile, result, stampISO), null, 2) + '\n');

  // 4. Storybook (its own).
  write('.storybook/main.js', storybookMain());
  write('.storybook/preview.js', storybookPreview());
  write('stories/Foundations.stories.js', foundationsStory(profile, result));
  write('stories/Button.stories.js', buttonStory());
  write('preview/index.html', staticGallery(profile));

  // 5. Figma library (its own).
  write('figma/FIGMA-SETUP.md', figmaSetup(profile));
  write('figma/tokens.studio.json', JSON.stringify(tokensStudioBundle(target), null, 2) + '\n');

  return { targetDir: target, filesWritten: written, baseUnchanged: true };
}

// --- safety ---------------------------------------------------------------

function assertOutsideBase(target) {
  if (target === BASE_ROOT) throw new Error('Refusing to generate: target is the base repo itself.');
  const rel = relative(BASE_ROOT, target);
  // rel === '' -> same dir; not starting with '..' -> a path *inside* the base repo.
  if (rel === '' || !rel.startsWith('..')) {
    throw new Error(`Refusing to generate into the base repo ("${rel}"). Brands must live in their own repo.`);
  }
}

// --- token helpers --------------------------------------------------------

function provenanceIndex(mappings) {
  const idx = {};
  for (const m of mappings) idx[m.param] = { source: m.source, confidence: m.confidence };
  return idx;
}

/** Set a DTCG leaf's $value at a dotted path, recording provenance. Returns true if a leaf existed. */
function setLeaf(doc, path, value, prov) {
  const parts = path.split('.');
  let node = doc;
  for (let i = 0; i < parts.length; i++) {
    if (node == null || typeof node !== 'object') return false;
    node = node[parts[i]];
  }
  if (!node || typeof node !== 'object' || !('$value' in node)) return false;
  node.$value = value;
  node.$extensions = {
    ...(node.$extensions || {}),
    bnts: { source: prov?.source || 'brand mapping', confidence: prov?.confidence || 'high' },
  };
  return true;
}

// --- file templates -------------------------------------------------------

function brandPackageJson(profile) {
  return JSON.stringify(
    {
      name: `${profile.brandSlug}-ds`,
      version: '0.1.0',
      description: `${profile.brandName} design system — generated from Base BNTS DS v${baseVersion()}. Do not edit the base; regenerate to update.`,
      type: 'module',
      scripts: {
        build: 'node style-dictionary.config.js',
        preview: 'echo "Open preview/index.html after running: npm run build"',
        storybook: 'storybook dev -p 6006',
        'build-storybook': 'storybook build',
      },
      dependencies: { 'style-dictionary': '^4.4.0' },
      devDependencies: { storybook: '^8.0.0', '@storybook/html-vite': '^8.0.0' },
      bnts: { generatedFrom: `base-bnts-ds@${baseVersion()}`, brand: profile.brandName },
    },
    null,
    2,
  ) + '\n';
}

function brandConfig(profile, result, stampISO) {
  return {
    brand: profile.brandName,
    slug: profile.brandSlug,
    generatedFrom: `base-bnts-ds@${baseVersion()}`,
    generatedAt: stampISO,
    source: profile.source,
    overrides: Object.keys(result.overrides).filter((k) => result.overrides[k] !== '(inherited)').length,
    warnings: result.warnings,
  };
}

function brandReadme(profile, result) {
  const overridden = Object.entries(result.overrides).filter(([, v]) => v !== '(inherited)');
  return `# ${profile.brandName} Design System

Generated from **Base BNTS DS v${baseVersion()}** by the brand generator (playbook Step 9/10).

- **Base is untouched.** This repo inherits the base \`semantic\` tier, \`base\` tier,
  and every headless \`component\` unchanged. Only the \`core\` tier carries
  ${profile.brandName}'s values (${overridden.length} overridden primitives).
- **Source of truth is still code.** Figma reads from these tokens, not the reverse.
- **To update:** change the ${profile.brandName} Figma file and re-run the generator.
  Do not hand-edit \`tokens/semantic\` or \`tokens/base\` — they belong to the base.

## Build

\`\`\`bash
npm install
npm run build          # tokens/{core,semantic,base} -> build/css + build/json
open preview/index.html # zero-install component gallery in the brand style
\`\`\`

## Storybook

\`\`\`bash
npm run build && npm run storybook
\`\`\`

## What came from the Figma file

See \`MAPPING-REVIEW.md\` for the full base-parameter ↔ Figma-value mapping table,
and \`brand.config.json\` for machine-readable provenance. Every overridden token
also records its origin in \`$extensions.bnts.source\`.
`;
}

function storybookMain() {
  return `/** @type { import('@storybook/html-vite').StorybookConfig } */
export default {
  stories: ['../stories/**/*.stories.js'],
  framework: { name: '@storybook/html-vite', options: {} },
};
`;
}

function storybookPreview() {
  return `// Load the brand token cascade + component styles into every story.
// Run \`npm run build\` first so build/css/*.css exist.
import '../build/css/core.css';
import '../build/css/semantic.css';
import '../build/css/base.css';

const importAllComponentCss = import.meta.glob('../components/**/*.css', { eager: true });
void importAllComponentCss;

export const parameters = {
  backgrounds: { default: 'page' },
};
`;
}

function buttonStory() {
  return `export default { title: 'Components/Button' };

const btn = (variant, size, label, extra = '') =>
  \`<button class="ds-button ds-button--\${variant} ds-button--\${size}" \${extra}>\${label}</button>\`;

export const Primary = () => btn('primary', 'md', 'Primary');
export const Secondary = () => btn('secondary', 'md', 'Secondary');
export const Ghost = () => btn('ghost', 'md', 'Ghost');
export const Destructive = () => btn('destructive', 'md', 'Delete');
export const Sizes = () =>
  \`<div style="display:flex;gap:.75rem;align-items:center">\${btn('primary', 'sm', 'Small')}\${btn('primary', 'md', 'Medium')}\${btn('primary', 'lg', 'Large')}</div>\`;
export const States = () =>
  \`<div style="display:flex;gap:.75rem;align-items:center">\${btn('primary', 'md', 'Default')}\${btn('primary', 'md', 'Disabled', 'disabled')}</div>\`;
`;
}

function foundationsStory(profile, result) {
  const brandTones = result.mappings
    .filter((m) => m.param.startsWith('color.brand.') && m.value !== '(inherited)')
    .map((m) => ({ tone: m.param.split('.').pop(), value: m.value }));
  const data = JSON.stringify(brandTones);
  return `export default { title: 'Foundations/Colour' };

const tones = ${data};

export const BrandRamp = () => {
  const sw = tones
    .map(
      (t) =>
        \`<div style="flex:1;min-width:64px"><div style="height:64px;border-radius:8px;background:\${t.value};border:1px solid #0001"></div><div style="font:12px sans-serif;margin-top:4px">\${t.tone}<br><code>\${t.value}</code></div></div>\`,
    )
    .join('');
  return \`<h3 style="font:600 14px sans-serif">${profile.brandName} — brand ramp</h3><div style="display:flex;gap:8px;flex-wrap:wrap">\${sw}</div>\`;
};
`;
}

function staticGallery(profile) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${profile.brandName} DS — component gallery</title>
  <link rel="stylesheet" href="../build/css/core.css" />
  <link rel="stylesheet" href="../build/css/semantic.css" />
  <link rel="stylesheet" href="../build/css/base.css" />
  <style>
    body { font-family: var(--ds-font-family-primary, sans-serif); background: var(--ds-surface-page, #fff); color: var(--ds-content-text-primary, #111); margin: 0; padding: 2rem; }
    h1 { font-size: 1.5rem; }
    p.sub { color: var(--ds-content-text-secondary); font-size: .875rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1rem; margin-top: 1.5rem; }
    .card { border: 1px solid var(--ds-color-border-default, #e5e5e5); border-radius: 12px; overflow: hidden; background: var(--ds-surface-card, #fff); }
    .card h2 { font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; margin: 0; padding: .6rem .9rem; border-bottom: 1px solid var(--ds-color-border-subtle, #eee); color: var(--ds-content-text-secondary); }
    iframe { width: 100%; height: 340px; border: 0; background: var(--ds-surface-page, #fff); }
  </style>
</head>
<body>
  <h1>${profile.brandName} Design System</h1>
  <p class="sub">Zero-install gallery. Run <code>npm run build</code> first, then open this file. Each frame is a base component rendered in the ${profile.brandName} style — no component code changed.</p>
  <div class="grid" id="grid"></div>
  <script>
    const components = ${JSON.stringify(readComponentNames())};
    const grid = document.getElementById('grid');
    for (const name of components) {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<h2>' + name + '</h2><iframe loading="lazy" src="../components/' + name + '/' + name + '.html"></iframe>';
      grid.appendChild(card);
    }
  </script>
</body>
</html>
`;
}

function figmaSetup(profile) {
  return `# ${profile.brandName} — Figma library setup

This brand has its **own** Figma library, separate from the base library.
Code is the source of truth; Figma reads from it (one-directional) via Tokens Studio.

## Steps (mirrors the base's Step 6, scoped to this brand)

1. In a **new Figma file** for ${profile.brandName}, install the **Tokens Studio** plugin.
2. Plugin → **Settings → Sync → Git (GitHub)**. Point it at this brand repo.
3. Set the token source to \`figma/tokens.studio.json\` (or the \`tokens/\` folder directly).
4. Pull. Tokens Studio creates Figma **Variables** whose names match the code
   (\`color.brand.500\`, \`radius.md\`, \`font.family.primary\`, ...).
5. Keep it **one-directional**: designers never push token edits from Figma back to
   code. Brand value changes happen in the ${profile.brandName} Figma design file and
   flow through the generator.

> Confirm current Tokens Studio + Figma Variables behaviour against their live docs;
> plugin settings move between versions.
`;
}

/** Combine the just-written brand tiers into one Tokens Studio bundle. */
function tokensStudioBundle(target) {
  const bundle = {};
  for (const tier of ['core', 'semantic', 'base']) {
    const dir = join(target, 'tokens', tier);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const doc = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      deepMerge(bundle, stripMeta(doc));
    }
  }
  return bundle;
}

function readComponentNames() {
  const dir = join(BASE_ROOT, 'components');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => existsSync(join(dir, n, `${n}.html`))).sort();
}

function stripMeta(obj) {
  if (Array.isArray(obj)) return obj.map(stripMeta);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === '$schema' || k === '$description' || k === '$extensions') continue;
      out[k] = stripMeta(v);
    }
    return out;
  }
  return obj;
}

function deepMerge(target, src) {
  for (const [k, v] of Object.entries(src)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && !('$value' in v)) {
      target[k] = deepMerge(target[k] || {}, v);
    } else {
      target[k] = v;
    }
  }
  return target;
}
