import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, TOKENS_DIR, COMPONENTS_DIR } from './tokenStore.js';

export function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function writeText(file, contents) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents, 'utf8');
}

/**
 * Applies an approved mapping onto copies of the base repo's own core token files.
 * Anything the mapping doesn't touch keeps the base's original core value — that's
 * intentional (documented fallback), never a fabricated brand value.
 */
function buildBrandCoreTokens(mapping) {
  const colorTree = readJson(path.join(TOKENS_DIR, 'core', 'color.json'));
  const radiusTree = readJson(path.join(TOKENS_DIR, 'core', 'radius.json'));
  const spacingTree = readJson(path.join(TOKENS_DIR, 'core', 'spacing.json'));
  const typographyTree = readJson(path.join(TOKENS_DIR, 'core', 'typography.json'));
  const structuralGaps = [];

  for (const [role, bucket] of Object.entries(mapping.color || {})) {
    const key = bucket.corePath.split('.')[1];
    if (!colorTree.color[key]) {
      colorTree.color[key] = {};
      if (key === 'secondary') {
        structuralGaps.push(
          'Added core.color.secondary from Figma, but tokens/semantic/color.json\'s secondary.* roles ' +
            'alias to the brand ramp in this base system — a semantic-tier edit (outside this generator\'s ' +
            'scope, since semantic/base stay byte-identical to the base) is required for it to take visual ' +
            'effect. Flagged for governance review rather than silently patched.'
        );
      }
    }
    for (const step of bucket.steps || []) {
      colorTree.color[key][step.step] = {
        $value: step.hex,
        $type: 'color',
        $description: `${role} ${step.step}${step.figmaSource ? ` — from Figma style "${step.figmaSource}"` : ' — interpolated, not read from Figma'}`,
      };
    }
  }

  for (const [key, entry] of Object.entries(mapping.radius?.keys || {})) {
    if (!(key in radiusTree.radius)) continue;
    radiusTree.radius[key] = {
      $value: entry.value,
      $type: 'dimension',
      $description: entry.figmaSource ? `From Figma style "${entry.figmaSource}"` : 'Brand override',
    };
  }

  for (const [key, entry] of Object.entries(mapping.spacing?.keys || {})) {
    if (!(key in spacingTree.spacing)) continue;
    spacingTree.spacing[key] = {
      $value: entry.value,
      $type: 'dimension',
      $description: entry.figmaSource ? `From Figma style "${entry.figmaSource}"` : 'Brand override',
    };
  }

  for (const [slot, entry] of Object.entries(mapping.fontFamily || {})) {
    if (!typographyTree.font.family[slot]) continue;
    typographyTree.font.family[slot] = {
      $value: entry.value,
      $type: 'fontFamily',
      $description: entry.figmaSource ? `From Figma style "${entry.figmaSource}"` : 'Brand override',
    };
  }

  return { colorTree, radiusTree, spacingTree, typographyTree, structuralGaps };
}

function styleDictionaryConfigTemplate() {
  return `import StyleDictionary from 'style-dictionary';

const sd = new StyleDictionary({
  log: { verbosity: 'verbose', warnings: 'warn' },
  source: ['tokens/core/**/*.json', 'tokens/semantic/**/*.json', 'tokens/base/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      prefix: 'ds',
      buildPath: 'build/css/',
      files: [
        { destination: 'core.css', format: 'css/variables', filter: (t) => t.filePath.startsWith('tokens/core/'), options: { selector: ':root', outputReferences: false } },
        { destination: 'semantic.css', format: 'css/variables', filter: (t) => t.filePath.startsWith('tokens/semantic/'), options: { selector: ':root', outputReferences: true } },
        { destination: 'base.css', format: 'css/variables', filter: (t) => t.filePath.startsWith('tokens/base/'), options: { selector: ':root', outputReferences: true } },
      ],
    },
    json: {
      transformGroup: 'js',
      buildPath: 'build/json/',
      files: [{ destination: 'tokens.json', format: 'json/nested' }],
    },
  },
});

await sd.buildAllPlatforms();
`;
}

function packageJsonTemplate(slug, brandName) {
  return {
    name: `${slug}-design-system`,
    version: '0.1.0',
    description: `${brandName} brand design system — generated from Base BNTS DS. Same headless components, only the core token values differ.`,
    type: 'module',
    scripts: {
      build: 'node style-dictionary.config.js',
      'build:watch': 'node --watch style-dictionary.config.js',
    },
    dependencies: { 'style-dictionary': '^4.4.0' },
  };
}

function readmeTemplate({ brandName, slug, sourceFiles, structuralGaps, generatedAt }) {
  return `# ${brandName} Design System

Generated from **Base BNTS DS** on ${generatedAt} by the Step 9 brand generator. This is a
standalone design system: its own tokens, its own build, its own home. It reuses the base
system's headless components **unchanged** — only \`tokens/core/*.json\` was replaced with
${brandName}'s values; \`tokens/semantic/\`, \`tokens/base/\`, and \`components/\` are byte-identical
copies of the base repo.

## Source

Mapped from these Figma file(s):
${sourceFiles.length ? sourceFiles.map((f) => `- ${f}`).join('\n') : '- (none recorded — mapping was supplied manually)'}

See \`MAPPING.md\` for the full base-parameter ↔ Figma-style mapping table that was approved
before this repo was generated.

${structuralGaps.length ? `## Flagged for review\n\n${structuralGaps.map((g) => `- ${g}`).join('\n')}\n` : ''}
## Quick start

\`\`\`bash
npm install
npm run build        # generates build/css/{core,semantic,base}.css and build/json/tokens.json
\`\`\`

## Making this a real, independent repo

This folder was generated inside the base repo's \`generated-brands/\` output directory so the
base itself was never touched. To turn it into what the playbook calls "its own repo":

\`\`\`bash
cd ${slug}
git init
git add -A
git commit -m "Initial ${brandName} design system, generated from Base BNTS DS"
# create an empty repo on GitHub/GitLab, then:
git remote add origin <new-repo-url>
git push -u origin main
\`\`\`

## Its own Figma library

\`tokens/tokens-studio.json\` is a Tokens Studio–compatible multi-set export (core / semantic /
base) for this brand. Push it into a **new, brand-specific Figma file** with the Tokens Studio
plugin, the same one-directional (Git → Figma) flow documented in the base repo's Step 6 — just
point it at this brand's token export and a fresh Figma file instead of the base library.

## Its own component preview

\`preview/index.html\` is a lightweight static gallery of every component rendered with this
brand's built CSS — open it after \`npm run build\`. Swap it for a full Storybook instance once
the base repo's Step 8 (Storybook) lands; the components themselves don't change.

## Governance

- The base system was **not modified** to generate this brand.
- This repo does not receive base updates automatically — re-run the brand generator against a
  newer base + the same (or updated) Figma mapping to pick up base changes.
`;
}

function mappingMarkdownTemplate({ brandName, sourceFiles, mapping, structuralGaps }) {
  const rows = [];
  for (const [role, bucket] of Object.entries(mapping.color || {})) {
    const corePath = bucket.corePath || `color.${role}`;
    for (const step of bucket.steps || []) {
      rows.push([`${corePath}.${step.step}`, step.hex, step.figmaSource || '(interpolated)', bucket.confidence, role]);
    }
  }
  for (const [key, entry] of Object.entries(mapping.radius?.keys || {})) {
    rows.push([`radius.${key}`, entry.value, entry.figmaSource || '(unchanged from base)', mapping.radius.confidence, '—']);
  }
  for (const [key, entry] of Object.entries(mapping.spacing?.keys || {})) {
    rows.push([`spacing.${key}`, entry.value, entry.figmaSource || '(unchanged from base)', mapping.spacing.confidence, '—']);
  }
  for (const [slot, entry] of Object.entries(mapping.fontFamily || {})) {
    rows.push([`font.family.${slot}`, entry.value, entry.figmaSource || '(unchanged from base)', 'high', '—']);
  }

  const table = [
    '| Base parameter (tokens/core) | Value | Figma source | Confidence | Feedback role |',
    '|---|---|---|---|---|',
    ...rows.map(([p, v, s, c, role]) => `| \`${p}\` | \`${v}\` | ${s} | ${c} | ${role} |`),
  ].join('\n');

  return `# ${brandName} — approved mapping

Source Figma file(s): ${sourceFiles.length ? sourceFiles.join(', ') : '(none recorded)'}

${table}

${structuralGaps.length ? `## Structural gaps flagged during generation\n\n${structuralGaps.map((g) => `- ${g}`).join('\n')}\n` : ''}
This file is the audit trail for Step 11 (review, refine, close the loop). Recurring corrections
made against this mapping should be folded back into \`mcp-server/lib/mappingRules.js\`.
`;
}

function tokensStudioExport(colorTree, radiusTree, spacingTree, typographyTree, semanticDir, baseDir) {
  const readAllInDir = (dir) => {
    const merged = {};
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      Object.assign(merged, readJson(path.join(dir, file)));
    }
    return merged;
  };
  return {
    core: { color: colorTree.color, radius: radiusTree.radius, spacing: spacingTree.spacing, font: typographyTree.font },
    semantic: readAllInDir(semanticDir),
    base: readAllInDir(baseDir),
  };
}

function previewGalleryHtml(componentNames) {
  const links = componentNames.map((name) => `<link rel="stylesheet" href="../components/${name}/${name}.css">`).join('\n  ');
  const sections = componentNames
    .map((name) => `<section><h2>${name}</h2><div id="${name}-mount"></div></section>`)
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Component preview</title>
<link rel="stylesheet" href="../build/css/core.css">
<link rel="stylesheet" href="../build/css/semantic.css">
<link rel="stylesheet" href="../build/css/base.css">
${links}
<style>body{font-family:sans-serif;padding:2rem;} section{margin-bottom:3rem;border-bottom:1px solid #eee;padding-bottom:2rem;}</style>
</head>
<body>
<h1>Component preview — run \`npm run build\` first</h1>
${sections}
<script>
  // Static gallery — fetches each component's .html snippet and mounts it, matching the base repo's build output layout.
  ${componentNames
    .map(
      (name) => `fetch('../components/${name}/${name}.html').then(r => r.text()).then(html => { document.getElementById('${name}-mount').innerHTML = html; }).catch(() => {});`
    )
    .join('\n  ')}
</script>
</body>
</html>
`;
}

/**
 * Generates a brand design system into generated-brands/<slug>. Only ever writes under that
 * output directory — never touches the base repo's tokens/ or components/.
 */
export function generateBrandSystem({ brandName, mapping, sourceFiles = [], overwrite = false, generatedAt = new Date().toISOString() }) {
  if (!brandName || !brandName.trim()) throw new Error('brandName is required');
  const slug = slugify(brandName);
  if (!slug) throw new Error(`brandName "${brandName}" did not produce a usable slug`);

  const outDir = path.join(REPO_ROOT, 'generated-brands', slug);
  if (existsSync(outDir) && !overwrite) {
    throw new Error(`generated-brands/${slug} already exists. Pass overwrite: true to regenerate it.`);
  }

  const { colorTree, radiusTree, spacingTree, typographyTree, structuralGaps } = buildBrandCoreTokens(mapping || {});

  // Components, semantic tier, and base tier are copied verbatim — the whole point of the
  // three-tier model is that these never need to change per brand.
  cpSync(COMPONENTS_DIR, path.join(outDir, 'components'), { recursive: true });
  cpSync(path.join(TOKENS_DIR, 'semantic'), path.join(outDir, 'tokens', 'semantic'), { recursive: true });
  cpSync(path.join(TOKENS_DIR, 'base'), path.join(outDir, 'tokens', 'base'), { recursive: true });

  writeJson(path.join(outDir, 'tokens', 'core', 'color.json'), colorTree);
  writeJson(path.join(outDir, 'tokens', 'core', 'radius.json'), radiusTree);
  writeJson(path.join(outDir, 'tokens', 'core', 'spacing.json'), spacingTree);
  writeJson(path.join(outDir, 'tokens', 'core', 'typography.json'), typographyTree);
  // border/elevation/motion/opacity core scales aren't brand-mapped (rarely differ per brand) —
  // copied straight from the base rather than invented.
  for (const file of ['border.json', 'elevation.json', 'motion.json', 'opacity.json']) {
    const src = path.join(TOKENS_DIR, 'core', file);
    if (existsSync(src)) cpSync(src, path.join(outDir, 'tokens', 'core', file));
  }

  writeText(path.join(outDir, 'style-dictionary.config.js'), styleDictionaryConfigTemplate());
  writeJson(path.join(outDir, 'package.json'), packageJsonTemplate(slug, brandName));
  writeText(path.join(outDir, '.gitignore'), 'node_modules/\nbuild/\n*.log\n.DS_Store\n');
  writeText(path.join(outDir, 'README.md'), readmeTemplate({ brandName, slug, sourceFiles, structuralGaps, generatedAt }));
  writeText(
    path.join(outDir, 'MAPPING.md'),
    mappingMarkdownTemplate({ brandName, sourceFiles, mapping: mapping || {}, structuralGaps })
  );
  writeJson(
    path.join(outDir, 'tokens', 'tokens-studio.json'),
    tokensStudioExport(colorTree, radiusTree, spacingTree, typographyTree, path.join(TOKENS_DIR, 'semantic'), path.join(TOKENS_DIR, 'base'))
  );

  const componentNames = readdirSync(COMPONENTS_DIR).sort();
  writeText(path.join(outDir, 'preview', 'index.html'), previewGalleryHtml(componentNames));

  return {
    brandName,
    slug,
    outputPath: path.relative(REPO_ROOT, outDir),
    baseUntouched: true,
    structuralGaps,
    nextSteps: [
      'npm install && npm run build inside the generated folder',
      'Open preview/index.html to sanity-check every component against the brand values',
      'git init the folder and push it to its own new repo (see its README)',
      "Push tokens/tokens-studio.json into a new Figma file via Tokens Studio for the brand's own Figma library",
      structuralGaps.length ? 'Resolve the flagged structural gaps before treating this as final' : null,
    ].filter(Boolean),
  };
}
