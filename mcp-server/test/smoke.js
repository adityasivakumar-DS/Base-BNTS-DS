#!/usr/bin/env node
// Exercises the base-doorway + brand-generator libs directly (no MCP SDK required),
// so it can run in any environment even before `npm install` pulls in the protocol SDK.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import { loadResolvedTokens } from '../lib/tokenStore.js';
import { getComponentManifest, listComponentNames } from '../lib/components.js';
import { proposeBrandMapping } from '../lib/mapper.js';
import { generateBrandSystem } from '../lib/brandGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('1. Loading + resolving base tokens...');
const { resolved, cssVarIndex } = loadResolvedTokens();
assert.ok(resolved.core.length > 0, 'core tier should not be empty');
assert.ok(resolved.semantic.length > 0, 'semantic tier should not be empty');
assert.ok(resolved.base.length > 0, 'base tier should not be empty');
const actionPrimaryBg = resolved.base.find((t) => t.path === 'action.primary.bg');
assert.ok(actionPrimaryBg && /^#/.test(actionPrimaryBg.resolvedValue), 'action.primary.bg should resolve to a hex color');
console.log(`   OK — core:${resolved.core.length} semantic:${resolved.semantic.length} base:${resolved.base.length} tokens, action.primary.bg -> ${actionPrimaryBg.resolvedValue}`);

console.log('2. Building component manifest from components/ on disk...');
const names = listComponentNames();
assert.ok(names.includes('button'), 'button component should exist');
const manifest = getComponentManifest(cssVarIndex);
const button = manifest.find((c) => c.name === 'button');
assert.ok(button.tokensConsumed.length > 0, 'button should consume at least one token');
const resolvedCount = button.tokensConsumed.filter((t) => t.tokenPath).length;
assert.equal(resolvedCount, button.tokensConsumed.length, 'every CSS var the button uses should resolve back to a known token');
console.log(`   OK — ${names.length} components, button consumes ${button.tokensConsumed.length} tokens (all resolved)`);

console.log('3. Proposing a brand mapping from the sample Figma extract...');
const sample = JSON.parse(readFileSync(path.join(__dirname, '../examples/sample-figma-extract.json'), 'utf8'));
const mapping = proposeBrandMapping(sample);
assert.ok(mapping.color.brand, 'brand color bucket should be mapped');
assert.equal(mapping.color.brand.steps.length, 13, 'brand ramp should have 13 steps');
assert.equal(mapping.unmapped.colors.length, 1, 'the sticker color should be left unmapped, not guessed');
assert.ok(mapping.radius.confidence === 'medium', 'radius has 3 values against a bigger scale — should not claim high confidence');
console.log(`   OK — ${Object.keys(mapping.color).length} color roles mapped, ${mapping.unmapped.colors.length} unmapped color(s) correctly flagged`);

console.log('4. Generating a brand system from the (auto-)approved mapping...');
const result = generateBrandSystem({ brandName: 'Acme Test Brand', mapping, sourceFiles: sample.sourceFiles, overwrite: true });
assert.equal(result.slug, 'acme-test-brand');
assert.equal(result.baseUntouched, true);
console.log(`   OK — generated at ${result.outputPath}`);
console.log(`   Next steps: ${result.nextSteps.join(' | ')}`);

console.log('\nAll smoke checks passed.');
