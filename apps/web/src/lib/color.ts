type Hsl = { h: number; s: number; l: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.trim().match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const raw = m[1];
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rr:
        h = ((gg - bb) / delta) % 6;
        break;
      case gg:
        h = (bb - rr) / delta + 2;
        break;
      case bb:
        h = (rr - gg) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: s * 100, l: l * 100 };
}

function hslCssValue(v: Hsl) {
  // Tailwind expects "--primary" in the form: "221 83% 45%"
  const h = Math.round(v.h);
  const s = Math.round(v.s);
  const l = Math.round(v.l);
  return `${h} ${s}% ${l}%`;
}

export function brandHexToCssVars(brandPrimaryColor: string): { primary: string; ring: string } | null {
  const rgb = hexToRgb(brandPrimaryColor);
  if (!rgb) return null;
  const base = rgbToHsl(rgb.r, rgb.g, rgb.b);
  // Use a slightly boosted lightness for focus ring.
  const ring: Hsl = { h: base.h, s: clamp(base.s + 3, 0, 100), l: clamp(base.l + 8, 0, 100) };
  return {
    primary: hslCssValue(base),
    ring: hslCssValue(ring),
  };
}

