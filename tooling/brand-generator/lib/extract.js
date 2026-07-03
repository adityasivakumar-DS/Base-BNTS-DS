/**
 * extract.js — get a normalized "design profile" out of a designer's Figma file.
 *
 * Two supported paths:
 *
 *  1. Live Figma MCP (the real designer flow, Step 10):
 *     The client calls the Figma MCP's `get_variable_defs` / `get_design_context`
 *     on the designer's file, gets back a flat map of variable name -> value, and
 *     passes that raw map to `fromFigmaVariableDefs()` here to normalize it.
 *
 *  2. A normalized profile JSON on disk (used for testing and for handing a
 *     pre-extracted brand to the generator): `loadProfile(path)`.
 *
 * Either way the rest of the generator only ever sees the normalized profile
 * shape documented in figma-inputs/README schema, so mapping stays deterministic.
 */
import { readFileSync } from 'node:fs';

/** Load a normalized design profile JSON from disk and validate the essentials. */
export function loadProfile(path) {
  const profile = JSON.parse(readFileSync(path, 'utf8'));
  return validateProfile(profile);
}

export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') throw new Error('Design profile must be an object.');
  if (!profile.brandName) throw new Error('Design profile is missing "brandName".');
  if (!profile.color || !profile.color.brand) {
    throw new Error('Design profile must define at least color.brand (the signature colour).');
  }
  profile.brandSlug = profile.brandSlug || slugify(profile.brandName);
  profile.source = profile.source || { tool: 'figma', files: [] };
  return profile;
}

export function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Normalize the flat variable map returned by Figma's MCP `get_variable_defs`
 * into our design-profile shape using name heuristics. Figma variable names look
 * like "Color/Brand/500", "Radius/md", "Font/Family/Primary".
 *
 * This is intentionally forgiving: anything it can't confidently place is
 * dropped (and therefore inherited from the base), never guessed into the wrong
 * role. The designer review step is where gaps get filled.
 */
export function fromFigmaVariableDefs(rawVars, meta = {}) {
  const profile = {
    brandName: meta.brandName || 'Untitled Brand',
    source: { tool: 'figma', files: meta.files || [] },
    color: {},
    typography: {},
    radius: {},
    spacing: {},
  };

  const colorRamps = {}; // family -> { tone: hex }
  for (const [rawName, rawValue] of Object.entries(rawVars || {})) {
    const name = rawName.toLowerCase().replace(/\s+/g, '');
    const parts = name.split(/[\/.]/);
    const value = typeof rawValue === 'object' && rawValue?.value != null ? rawValue.value : rawValue;

    if (parts[0] === 'color' || parts[0] === 'colors') {
      const family = parts[1];
      const tone = parts[2];
      if (family && tone && /^\d+$/.test(tone)) {
        (colorRamps[family] ||= {})[tone] = value;
      } else if (family) {
        profile.color[family] = value; // single-swatch role, e.g. color/success
      }
    } else if (parts[0] === 'radius' || parts[0] === 'corner') {
      if (parts[1]) profile.radius[parts[1]] = value;
    } else if (parts[0] === 'spacing' || parts[0] === 'space') {
      if (parts[1]) profile.spacing[parts[1]] = value;
    } else if (parts[0] === 'font' || parts[0] === 'typography') {
      if (name.includes('family')) {
        if (name.includes('display') || name.includes('heading')) profile.typography.fontFamilyDisplay = value;
        else if (name.includes('secondary')) profile.typography.fontFamilySecondary = value;
        else profile.typography.fontFamilyPrimary = value;
      } else if (name.includes('size') && parts[2]) {
        (profile.typography.sizes ||= {})[parts[2]] = value;
      }
    }
  }
  Object.assign(profile.color, colorRamps);
  return validateProfile(profile);
}
