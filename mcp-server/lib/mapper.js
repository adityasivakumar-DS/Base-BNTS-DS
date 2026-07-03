import {
  COLOR_ROLE_RULES,
  COLOR_RAMP_STEPS,
  COLOR_RAMP_ANCHOR_STEP,
  RADIUS_SCALE_KEYS,
  SPACING_SCALE_KEYS,
  FONT_FAMILY_SLOT_RULES,
} from './mappingRules.js';
import { generateRampFromAnchor } from './colorMath.js';

// Generic UI-hierarchy words ("bg-primary", "text-primary") use "primary" to mean
// "the main one of this property", not brand identity — without this guard those
// collide with the brand rule's "primary" keyword on nothing but coincidence.
const GENERIC_UI_ROLE_WORDS = ['bg', 'background', 'text', 'fg', 'foreground', 'surface', 'border', 'stroke', 'icon'];

function matchKeyword(name, rules) {
  const lower = String(name || '').toLowerCase();
  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (!lower.includes(kw)) continue;
      if (kw === 'primary' && GENERIC_UI_ROLE_WORDS.some((word) => lower.includes(word))) continue;
      return rule;
    }
  }
  return undefined;
}

function toPx(value) {
  if (typeof value === 'number') return `${value}px`;
  const str = String(value).trim();
  return /^[0-9.]+$/.test(str) ? `${str}px` : str;
}

function numericValue(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function mapColors(colors = []) {
  const buckets = new Map(COLOR_ROLE_RULES.map((rule) => [rule.role, []]));
  const unmapped = [];

  for (const color of colors) {
    const rule = matchKeyword(color.name, COLOR_ROLE_RULES);
    if (!rule) {
      unmapped.push(color);
      continue;
    }
    buckets.get(rule.role).push({ ...color, corePath: rule.corePath });
  }

  const result = {};
  for (const rule of COLOR_ROLE_RULES) {
    const entries = buckets.get(rule.role);
    if (entries.length === 0) continue;

    if (entries.length >= COLOR_RAMP_STEPS.length) {
      // Enough entries to fill the ramp directly — assume they're already ordered light -> dark
      // by whatever order the caller supplied (typically Figma's own sort order).
      const steps = COLOR_RAMP_STEPS.map((step, i) => ({
        step,
        hex: entries[i]?.value,
        source: 'figma',
        figmaSource: entries[i]?.name,
        needsReview: false,
      }));
      result[rule.role] = { corePath: rule.corePath, description: rule.description, confidence: 'high', steps };
    } else if (entries.length === 1) {
      const ramp = generateRampFromAnchor(entries[0].value, COLOR_RAMP_STEPS, COLOR_RAMP_ANCHOR_STEP);
      const steps = ramp.map((s) => ({
        ...s,
        figmaSource: s.source === 'figma' ? entries[0].name : null,
        needsReview: s.source === 'interpolated',
      }));
      result[rule.role] = { corePath: rule.corePath, description: rule.description, confidence: 'medium', steps };
    } else {
      // A handful of shades but not a full ramp — place what we have at the nearest steps by
      // sorting lightness-independent input order, interpolate the anchor from the middle entry.
      const anchor = entries[Math.floor(entries.length / 2)];
      const ramp = generateRampFromAnchor(anchor.value, COLOR_RAMP_STEPS, COLOR_RAMP_ANCHOR_STEP);
      const steps = ramp.map((s) => ({ ...s, figmaSource: s.step === COLOR_RAMP_ANCHOR_STEP ? anchor.name : null, needsReview: true }));
      result[rule.role] = {
        corePath: rule.corePath,
        description: rule.description,
        confidence: 'low',
        steps,
        notes: `Received ${entries.length} shades (not 1, not a full ${COLOR_RAMP_STEPS.length}-step ramp) — only the middle shade was used as the anchor; every step needs manual review.`,
      };
    }
  }

  return { buckets: result, unmapped };
}

function mapScale(items = [], scaleKeys) {
  if (items.length === 0) return { keys: {}, confidence: 'n/a', notes: null, unmapped: [] };

  const sorted = [...items]
    .map((item) => ({ ...item, numeric: numericValue(item.value) }))
    .filter((item) => item.numeric !== null)
    .sort((a, b) => a.numeric - b.numeric);
  const unmapped = items.filter((item) => numericValue(item.value) === null);

  const keys = {};
  const confidence = sorted.length === scaleKeys.length ? 'high' : 'medium';
  const usableKeys = scaleKeys.filter((k) => k !== 'none' && k !== 'full'); // endpoints are usually fixed (0 / pill), not brand-supplied
  const fillTargets = sorted.length === scaleKeys.length ? scaleKeys : usableKeys;

  fillTargets.forEach((key, i) => {
    const item = sorted[i];
    if (item) keys[key] = { value: toPx(item.numeric), figmaSource: item.name, needsReview: confidence !== 'high' };
  });

  return {
    keys,
    confidence,
    notes:
      confidence === 'high'
        ? null
        : `Received ${sorted.length} values against a ${scaleKeys.length}-slot scale — mapped by ascending order into the closest slots; confirm before generating.`,
    unmapped,
  };
}

function mapTypography(typography = []) {
  const fontFamily = {};
  const unmapped = [];

  for (const style of typography) {
    const rule = matchKeyword(style.name, FONT_FAMILY_SLOT_RULES);
    if (!rule || !style.fontFamily) {
      unmapped.push(style);
      continue;
    }
    if (!fontFamily[rule.slot]) {
      fontFamily[rule.slot] = { value: style.fontFamily, figmaSource: style.name };
    }
  }

  return { fontFamily, unmapped };
}

/**
 * Proposes a mapping from extracted Figma styles onto the base system's CORE parameters.
 * Never fills a gap it can't justify — anything unresolved comes back under `unmapped` for
 * a human (or the requesting AI, per the playbook's "ask before assuming" rule) to resolve.
 */
export function proposeBrandMapping(figmaStyles = {}) {
  const { colors = [], radii = [], spacing = [], typography = [], sourceFiles = [] } = figmaStyles;

  const colorResult = mapColors(colors);
  const radiusResult = mapScale(radii, RADIUS_SCALE_KEYS);
  const spacingResult = mapScale(spacing, SPACING_SCALE_KEYS);
  const typographyResult = mapTypography(typography);

  const needsReviewCount =
    Object.values(colorResult.buckets).reduce((n, b) => n + b.steps.filter((s) => s.needsReview).length, 0) +
    Object.values(radiusResult.keys).filter((k) => k.needsReview).length +
    Object.values(spacingResult.keys).filter((k) => k.needsReview).length;

  const unmappedCount =
    colorResult.unmapped.length + radiusResult.unmapped.length + spacingResult.unmapped.length + typographyResult.unmapped.length;

  return {
    sourceFiles,
    color: colorResult.buckets,
    radius: radiusResult,
    spacing: spacingResult,
    fontFamily: typographyResult.fontFamily,
    unmapped: {
      colors: colorResult.unmapped,
      radii: radiusResult.unmapped,
      spacing: spacingResult.unmapped,
      typography: typographyResult.unmapped,
    },
    summary: [
      `${Object.keys(colorResult.buckets).length} color role(s) mapped, ${colorResult.unmapped.length} color style(s) unmapped.`,
      `Radius: ${radiusResult.confidence} confidence.`,
      `Spacing: ${spacingResult.confidence} confidence.`,
      `${Object.keys(typographyResult.fontFamily).length} font-family slot(s) mapped, ${typographyResult.unmapped.length} type style(s) unmapped.`,
      needsReviewCount > 0 ? `${needsReviewCount} value(s) were interpolated, not read — review before approving.` : null,
      unmappedCount > 0 ? `${unmappedCount} Figma style(s) did not match any base parameter — resolve manually before generating.` : null,
      'Nothing is generated until this mapping is explicitly approved.',
    ].filter(Boolean),
  };
}
