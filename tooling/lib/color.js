/**
 * color.js — minimal, dependency-free colour maths for the brand generator.
 *
 * Two jobs:
 *  1. Turn a single brand seed colour into a full 0..1000 tone ramp when a
 *     designer's Figma file only gives us one swatch (a "derived" ramp — always
 *     flagged for review, never silently trusted).
 *  2. Check WCAG contrast so the generator can warn before a brand ships an
 *     unreadable action colour (ties into governance / Step 7).
 */

export function hexToRgb(hex) {
  const h = String(hex).trim().replace(/^#/, '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }) {
  const c = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linear mix between two colours. t=0 -> a, t=1 -> b. */
export function mix(a, b, t) {
  return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

// Tone -> mix instruction. Positive = toward white (tint), negative = toward black (shade).
const TONE_MIX = {
  0: ['white', 1],
  50: ['white', 0.9],
  100: ['white', 0.8],
  200: ['white', 0.6],
  300: ['white', 0.4],
  400: ['white', 0.2],
  500: ['seed', 0],
  600: ['black', 0.12],
  700: ['black', 0.26],
  800: ['black', 0.42],
  900: ['black', 0.58],
  950: ['black', 0.72],
  1000: ['black', 1],
};

/**
 * Build a { 0, 50, ... 1000 } hex ramp from one seed colour.
 * The seed lands on tone 500; lighter tones tint toward white, darker toward black.
 */
export function generateRamp(seedHex) {
  const seed = hexToRgb(seedHex);
  if (!seed) throw new Error(`generateRamp: invalid seed colour "${seedHex}"`);
  const ramp = {};
  for (const [tone, [dir, t]] of Object.entries(TONE_MIX)) {
    if (dir === 'seed') ramp[tone] = rgbToHex(seed);
    else if (dir === 'white') ramp[tone] = rgbToHex(mix(seed, WHITE, t));
    else ramp[tone] = rgbToHex(mix(seed, BLACK, t));
  }
  return ramp;
}

function channelLuminance(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return 0.2126 * channelLuminance(rgb.r) + 0.7152 * channelLuminance(rgb.g) + 0.0722 * channelLuminance(rgb.b);
}

/** WCAG 2.x contrast ratio between two hex colours (1..21). */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la == null || lb == null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Best of white/black text for a given background, plus the ratio it achieves. */
export function readableTextOn(bgHex) {
  const onWhite = contrastRatio(bgHex, '#ffffff');
  const onBlack = contrastRatio(bgHex, '#000000');
  return onWhite >= onBlack
    ? { text: '#ffffff', ratio: onWhite }
    : { text: '#000000', ratio: onBlack };
}
