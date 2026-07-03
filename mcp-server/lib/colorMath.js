/** Minimal hex <-> HSL helpers used only to interpolate a color ramp from one anchor tone. */

export function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

export function rgbToHex({ r, g, b }) {
  const toHex = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

export function hslToRgb({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

/**
 * Generates a 13-step ramp (matching COLOR_RAMP_STEPS order) from one anchor hex color
 * assumed to sit at the "500" step. Pure lightness interpolation — same technique used
 * by most Tailwind-style palette generators. Hue/saturation are held constant.
 */
export function generateRampFromAnchor(anchorHex, steps, anchorStep) {
  const hsl = rgbToHsl(hexToRgb(anchorHex));
  const anchorIndex = steps.indexOf(anchorStep);
  // Lightness targets: near-white at the lightest step, near-black at the darkest.
  const lightnessAt = (index) => {
    if (index === 0) return 1; // "0" step == pure white in this system
    if (index === steps.length - 1) return 0; // "1000" step == pure black
    const lightMax = 0.97;
    const darkMin = 0.06;
    if (index <= anchorIndex) {
      const t = index / anchorIndex;
      return lightMax + (hsl.l - lightMax) * t;
    }
    const t = (index - anchorIndex) / (steps.length - 1 - anchorIndex);
    return hsl.l + (darkMin - hsl.l) * t;
  };

  return steps.map((step, index) => {
    if (step === anchorStep) return { step, hex: anchorHex, source: 'figma' };
    const l = lightnessAt(index);
    const hex = rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l }));
    return { step, hex, source: 'interpolated' };
  });
}
