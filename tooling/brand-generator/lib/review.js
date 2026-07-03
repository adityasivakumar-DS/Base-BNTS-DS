/**
 * review.js — the human-in-the-loop step.
 *
 * The mapping produced by map.js is a DRAFT. This module renders it as a table a
 * designer can read (base parameter, value read from Figma, source, confidence),
 * and applies the designer's corrections before generation. Generation is blocked
 * until the mapping is explicitly approved.
 */

/** Render the draft mapping as a reviewable Markdown document. */
export function renderReviewMarkdown(result, profile) {
  const { brand, mappings, warnings } = result;
  const lines = [];
  lines.push(`# Brand mapping review — ${brand.name}`);
  lines.push('');
  lines.push(`> Auto-generated draft. **Review and correct before generating.**`);
  lines.push(`> Source Figma file(s): ${(profile.source?.files || []).join(', ') || '(none recorded)'}`);
  lines.push('');

  if (warnings.length) {
    lines.push('## ⚠ Warnings');
    for (const w of warnings) lines.push(`- **${w.level.toUpperCase()}** — ${w.message}`);
    lines.push('');
  }

  const byConf = { high: [], derived: [], inherited: [] };
  for (const m of mappings) (byConf[m.confidence] ||= []).push(m);

  lines.push('## Mapping');
  lines.push('');
  lines.push('| Base parameter | Value | From Figma | Confidence | Note |');
  lines.push('|---|---|---|---|---|');
  for (const m of mappings) {
    const swatch = isHex(m.value) ? `\`${m.value}\`` : `\`${m.value}\``;
    lines.push(`| \`${m.param}\` | ${swatch} | ${m.source} | ${m.confidence} | ${m.note || ''} |`);
  }
  lines.push('');
  lines.push(`_${byConf.high.length} read directly · ${byConf.derived.length} derived (please check) · ${byConf.inherited.length} inherited from base._`);
  lines.push('');
  lines.push('## How to correct');
  lines.push('Edit `mapping.corrections.json` (a flat `{ "base.param": "value" }` map),');
  lines.push('then re-run the generator with `--approve --corrections mapping.corrections.json`.');
  lines.push('');
  return lines.join('\n');
}

/** Machine-readable draft, saved alongside the Markdown for tooling/audit. */
export function toReviewJson(result, profile) {
  return {
    brand: result.brand,
    source: profile.source,
    generatedAt: null, // stamped by the caller (no clock in pure logic)
    warnings: result.warnings,
    mappings: result.mappings,
  };
}

/**
 * Apply a designer's corrections to the draft. Corrections is a flat map of
 * base-parameter -> new value. Returns a new result; every corrected row is
 * re-flagged confidence "corrected" with source "designer".
 */
export function applyCorrections(result, corrections = {}) {
  const overrides = { ...result.overrides };
  const mappings = result.mappings.map((m) => ({ ...m }));
  for (const [param, value] of Object.entries(corrections)) {
    overrides[param] = value;
    const row = mappings.find((m) => m.param === param);
    if (row) {
      row.value = value;
      row.source = 'designer (corrected)';
      row.confidence = 'corrected';
      row.note = 'overridden in review';
    } else {
      mappings.push({ param, value, source: 'designer (added)', confidence: 'corrected', note: 'added in review' });
    }
  }
  return { ...result, mappings, overrides };
}

/** Blocking gate: errors must be resolved (or corrected) before generation. */
export function approvalBlockers(result) {
  return result.warnings.filter((w) => w.level === 'error');
}

function isHex(v) {
  return typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}
