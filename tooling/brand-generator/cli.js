#!/usr/bin/env node
/**
 * brand-gen — the brand generator CLI.
 *
 * Pipeline:  extract (Figma) -> map -> REVIEW -> (approve) -> generate
 *
 *   # 1. Draft a mapping and stop for review (nothing is generated):
 *   node cli.js figma-inputs/epl.figma.json --out ../EPL-Repo-AI-DS
 *
 *   # 2. After the designer edits mapping.corrections.json, generate:
 *   node cli.js figma-inputs/epl.figma.json --out ../EPL-Repo-AI-DS \
 *        --approve --corrections ../EPL-Repo-AI-DS/mapping.corrections.json --build
 *
 * The live designer flow (Step 10) swaps step 1's file input for the Figma MCP:
 * call get_variable_defs on the designer's file, pass the result through
 * extract.fromFigmaVariableDefs(), then the same map/review/generate follows.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { loadProfile } from './lib/extract.js';
import { mapProfile } from './lib/map.js';
import { renderReviewMarkdown, toReviewJson, applyCorrections, approvalBlockers } from './lib/review.js';
import { generateBrand } from './lib/generate.js';
import { baseVersion } from '../lib/base-reader.js';

function parseArgs(argv) {
  const args = { _: [], approve: false, build: false, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--approve') args.approve = true;
    else if (a === '--build') args.build = true;
    else if (a === '--force') args.force = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--corrections') args.corrections = argv[++i];
    else if (a === '--name') args.name = argv[++i];
    else if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`);
    else args._.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = args._[0];
  if (!input) {
    console.error('Usage: brand-gen <figma-profile.json> --out <brand-repo-dir> [--approve --corrections <file> --build]');
    process.exit(2);
  }

  console.log(`\nBrand generator — reading base BNTS DS v${baseVersion()}`);
  console.log('────────────────────────────────────────────────────────');

  // 1. Extract
  const profile = loadProfile(resolve(input));
  if (args.name) profile.brandName = args.name;
  console.log(`Brand:  ${profile.brandName} (${profile.brandSlug})`);
  console.log(`Figma:  ${(profile.source?.files || []).join(', ') || '(local profile, no file link)'}`);

  // 2. Map
  let result = mapProfile(profile);

  // 3. Corrections (from a prior review round)
  let corrections = {};
  if (args.corrections && existsSync(resolve(args.corrections))) {
    corrections = JSON.parse(readFileSync(resolve(args.corrections), 'utf8'));
    // Ignore the template's own comment key if present.
    delete corrections['//'];
    result = applyCorrections(result, corrections);
    console.log(`Applied ${Object.keys(corrections).length} designer correction(s).`);
  }

  // 4. Review artifacts (always written, so the designer has something to read)
  const stampISO = new Date().toISOString();
  const outDir = resolve(args.out || `./${profile.brandSlug}-review`);
  mkdirSync(outDir, { recursive: true });
  const reviewMd = renderReviewMarkdown(result, profile);
  const reviewJson = { ...toReviewJson(result, profile), generatedAt: stampISO };
  writeFileSync(join(outDir, 'MAPPING-REVIEW.md'), reviewMd);
  writeFileSync(join(outDir, 'mapping.draft.json'), JSON.stringify(reviewJson, null, 2) + '\n');
  if (!existsSync(join(outDir, 'mapping.corrections.json'))) {
    writeFileSync(
      join(outDir, 'mapping.corrections.json'),
      JSON.stringify({ '//': 'Flat map of base.parameter -> corrected value. Fill in, then re-run with --approve.' }, null, 2) + '\n',
    );
  }

  printSummary(result);
  console.log(`\nReview draft written to:\n  ${join(outDir, 'MAPPING-REVIEW.md')}`);

  const blockers = approvalBlockers(result);

  // 5. Gate
  if (!args.approve) {
    console.log('\nStopped for review. Nothing generated.');
    console.log('When ready: re-run with --approve (and --corrections <file> if you edited the mapping).');
    if (blockers.length) console.log(`\n⚠ ${blockers.length} blocker(s) must be resolved or corrected before --approve will proceed.`);
    return;
  }

  if (blockers.length && !args.force) {
    console.error(`\n✖ Cannot generate: ${blockers.length} unresolved blocker(s):`);
    for (const b of blockers) console.error(`   - ${b.message}`);
    console.error('Fix them in mapping.corrections.json, or pass --force to override with sign-off.');
    process.exit(1);
  }

  // 6. Generate
  console.log('\nApproved. Generating brand design system…');
  const out = generateBrand({ profile, result, targetDir: outDir, stampISO });
  // Persist the final (post-correction) review inside the brand repo too.
  writeFileSync(join(out.targetDir, 'MAPPING-REVIEW.md'), reviewMd);

  console.log(`\n✓ Generated ${profile.brandName} DS into: ${out.targetDir}`);
  console.log(`  ${out.filesWritten.length} paths written. Base repo modified: ${out.baseUnchanged ? 'NO ✓' : 'YES ✖'}`);

  if (args.build) runBuild(out.targetDir);
  else console.log('\nNext: cd into the brand repo, `npm install && npm run build`, then open preview/index.html');
}

function printSummary(result) {
  const counts = result.mappings.reduce((a, m) => ((a[m.confidence] = (a[m.confidence] || 0) + 1), a), {});
  console.log('\nMapping summary:');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(10)} ${v}`);
  if (result.warnings.length) {
    console.log('\nWarnings:');
    for (const w of result.warnings) console.log(`  [${w.level}] ${w.message}`);
  }
}

function runBuild(dir) {
  console.log('\nVerifying the brand build (style-dictionary)…');
  try {
    if (!existsSync(join(dir, 'node_modules'))) execSync('npm install', { cwd: dir, stdio: 'inherit' });
    execSync('npm run build', { cwd: dir, stdio: 'inherit' });
    console.log('✓ Brand tokens compiled to build/css + build/json');
  } catch (e) {
    console.error('✖ Brand build failed:', e.message);
    process.exitCode = 1;
  }
}

main();
