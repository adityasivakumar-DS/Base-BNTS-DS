/**
 * map.js — auto-map a designer's design profile onto the base CORE tier.
 *
 * Output is a DRAFT for the designer to review, never a final artifact:
 *   { mappings[], warnings[], overrides{} }
 * where `overrides` is a flat { "color.brand.500": "#..." } patch applied to the
 * base core tokens at generation time.
 *
 * Guiding rule (from mapping-rules.json): prefer a value read from Figma; when we
 * must compute one (a ramp from a single seed), mark it "derived" so the designer
 * knows to check it.
 */
import { flatTier, readRules } from '../../lib/base-reader.js';
import { generateRamp, contrastRatio, hexToRgb } from '../../lib/color.js';

const TONES = ['0', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950', '1000'];

export function mapProfile(profile) {
  const rules = readRules('mapping-rules');
  const baseCore = flatTier('core');
  const mappings = [];
  const warnings = [];
  const overrides = {};

  const add = (param, value, source, confidence, note) => {
    mappings.push({ param, value, source, confidence, note });
    overrides[param] = value;
  };

  // ---- Colour ramps -------------------------------------------------------
  for (const [target, rule] of Object.entries(rules.color.ramps)) {
    const family = target.split('.').pop(); // e.g. "brand"
    const found = resolveColor(profile.color, rule.from, family);
    if (!found) {
      if (rule.required) warnings.push({ level: 'error', message: `Required colour ramp "${family}" not found in Figma file; brand cannot be generated without it.` });
      else noteInherited(mappings, `${target}.500`, `base default ${baseCore[`${target}.500`]?.value ?? ''}`);
      continue;
    }
    if (typeof found.value === 'object') {
      // Full ramp read from Figma.
      for (const tone of TONES) {
        const hex = found.value[tone];
        if (hex) add(`${target}.${tone}`, normalizeHex(hex), `${found.source} / ${tone}`, 'high');
        else noteInherited(mappings, `${target}.${tone}`, `base default ${baseCore[`${target}.${tone}`]?.value ?? ''}`);
      }
    } else {
      // Single seed -> derive the ramp.
      const seed = normalizeHex(found.value);
      const ramp = generateRamp(seed);
      for (const tone of TONES) {
        const conf = tone === (rule.seedTone || '500') ? 'high' : 'derived';
        const note = conf === 'derived' ? 'tinted/shaded from the seed — confirm' : 'the seed swatch';
        add(`${target}.${tone}`, ramp[tone], `${found.source} (seed)`, conf, note);
      }
    }
  }

  // ---- Typography ---------------------------------------------------------
  const t = profile.typography || {};
  mapValue(add, mappings, baseCore, 'font.family.primary', t.fontFamilyPrimary, 'Figma: primary font');
  mapValue(add, mappings, baseCore, 'font.family.secondary', t.fontFamilySecondary || t.fontFamilyPrimary, 'Figma: secondary font');
  mapValue(add, mappings, baseCore, 'font.family.display', t.fontFamilyDisplay || t.fontFamilyPrimary, 'Figma: display font');
  if (t.sizes) {
    for (const [step, val] of Object.entries(t.sizes)) {
      if (baseCore[`font.size.${step}`]) add(`font.size.${step}`, normalizeDim(val), `Figma: font size ${step}`, 'high');
    }
  }

  // ---- Radius ------------------------------------------------------------
  mapScale(add, mappings, baseCore, 'radius', profile.radius, 'Figma: radius');

  // ---- Spacing -----------------------------------------------------------
  mapScale(add, mappings, baseCore, 'spacing', profile.spacing, 'Figma: spacing');

  // ---- Contrast gate (governance) ----------------------------------------
  // action.primary.bg resolves to color.brand.500; text-on-primary is white.
  const brand500 = overrides['color.brand.500'];
  if (brand500) {
    const ratio = contrastRatio(brand500, '#ffffff');
    if (ratio != null && ratio < 4.5) {
      warnings.push({
        level: 'error',
        message: `Contrast fail: brand primary ${brand500} on white text is ${ratio.toFixed(2)}:1 (WCAG AA needs 4.5:1). Designer sign-off required before this ships.`,
      });
    } else if (ratio != null && ratio < 7) {
      warnings.push({ level: 'info', message: `Brand primary passes AA (${ratio.toFixed(2)}:1) but not AAA (7:1).` });
    }
  }

  return { brand: { name: profile.brandName, slug: profile.brandSlug }, mappings, warnings, overrides };
}

// --- helpers ---------------------------------------------------------------

function resolveColor(colorProfile, fromList, family) {
  if (!colorProfile) return null;
  const candidates = new Set([family, ...fromList.map((f) => f.split('.').pop())]);
  for (const key of candidates) {
    if (colorProfile[key] != null) return { value: colorProfile[key], source: `Figma: color/${key}` };
  }
  return null;
}

function mapValue(add, mappings, baseCore, path, value, source) {
  if (value == null) {
    noteInherited(mappings, path, `base default ${baseCore[path]?.value ?? ''}`);
    return;
  }
  add(path, value, source, 'high');
}

function mapScale(add, mappings, baseCore, prefix, scale, source) {
  if (!scale || typeof scale !== 'object' || Object.keys(scale).length === 0) {
    noteInherited(mappings, `${prefix}.*`, 'whole scale inherited from base');
    return;
  }
  for (const [step, val] of Object.entries(scale)) {
    const path = `${prefix}.${step}`;
    if (baseCore[path]) add(path, normalizeDim(val), `${source} ${step}`, 'high');
    else add(path, normalizeDim(val), `${source} ${step}`, 'derived', 'not a standard base step — added');
  }
}

function noteInherited(mappings, param, note) {
  mappings.push({ param, value: '(inherited)', source: '—', confidence: 'inherited', note });
}

function normalizeHex(v) {
  const rgb = hexToRgb(v);
  return rgb ? v.trim().toLowerCase() : v;
}

function normalizeDim(v) {
  if (typeof v === 'number') return `${v}px`;
  return String(v).trim();
}
