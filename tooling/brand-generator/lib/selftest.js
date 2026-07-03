#!/usr/bin/env node
/**
 * selftest.js — fast, dependency-free checks for the generator's core logic.
 * Run: npm test  (from tooling/)
 */
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generateRamp, contrastRatio } from '../../lib/color.js';
import { mapProfile } from './map.js';
import { approvalBlockers } from './review.js';
import { generateBrand } from './generate.js';
import { validateProfile } from './extract.js';
import { BASE_ROOT } from '../../lib/base-reader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let pass = 0;
let fail = 0;
const ok = (cond, msg) => (cond ? (pass++, console.log(`  ✓ ${msg}`)) : (fail++, console.error(`  ✖ ${msg}`)));

console.log('color:');
const ramp = generateRamp('#37003c');
ok(Object.keys(ramp).length === 13, 'ramp has 13 tones');
ok(ramp['500'] === '#37003c', 'seed lands on tone 500');
ok(ramp['0'] === '#ffffff' && ramp['1000'] === '#000000', 'ends anchor white/black');
ok(Math.round(contrastRatio('#ffffff', '#000000')) === 21, 'white/black contrast is 21:1');

console.log('mapping:');
const eplProfile = validateProfile(JSON.parse(readFileSync(join(__dirname, '..', 'figma-inputs', 'epl.figma.json'), 'utf8')));
const eplResult = mapProfile(eplProfile);
ok(eplResult.overrides['color.brand.500'] === '#37003c', 'brand seed mapped to color.brand.500');
ok(eplResult.overrides['color.neutral.500'] === '#726d82', 'full neutral ramp mapped tone-by-tone');
ok(eplResult.overrides['radius.md'] === '10px', 'radius.md read from Figma');
ok(approvalBlockers(eplResult).length === 0, 'EPL (dark purple on white) has no contrast blockers');

console.log('contrast gate:');
const badResult = mapProfile(validateProfile({ brandName: 'Bad', color: { brand: '#ffe600' } }));
ok(approvalBlockers(badResult).length >= 1, 'bright yellow brand on white text is blocked by the gate');

console.log('generate (into temp, base untouched):');
const tmp = mkdtempSync(join(tmpdir(), 'brandgen-'));
const out = generateBrand({ profile: eplProfile, result: eplResult, targetDir: tmp, stampISO: '1970-01-01T00:00:00.000Z' });
ok(out.baseUnchanged === true, 'generator reports base unchanged');
const semSrc = readFileSync(join(BASE_ROOT, 'tokens/semantic/color.json'), 'utf8');
const semOut = readFileSync(join(tmp, 'tokens/semantic/color.json'), 'utf8');
ok(semSrc === semOut, 'semantic tier copied byte-for-byte (inherited, not rewritten)');
const brandCore = JSON.parse(readFileSync(join(tmp, 'tokens/core/color.json'), 'utf8'));
ok(brandCore.color.brand['500'].$value === '#37003c', 'brand core color.brand.500 overridden');
ok(brandCore.color.brand['500'].$extensions.bnts.source.includes('Figma'), 'overridden token records provenance');
ok(existsSync(join(tmp, '.storybook/main.js')), 'Storybook config generated');
ok(existsSync(join(tmp, 'figma/FIGMA-SETUP.md')), 'Figma library setup generated');
ok(existsSync(join(tmp, 'preview/index.html')), 'static preview gallery generated');

// Assert nothing was written into the base repo's core (guard the safety check).
let refused = false;
try {
  generateBrand({ profile: eplProfile, result: eplResult, targetDir: resolve(BASE_ROOT, 'tokens'), stampISO: 'x' });
} catch {
  refused = true;
}
ok(refused, 'refuses to generate inside the base repo');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
