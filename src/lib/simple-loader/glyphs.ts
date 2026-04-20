// 5×5 pixel-art glyphs. 1 = active cell.
// Rows top-to-bottom, columns left-to-right.

export type Glyph5 = number[][];

export const GLYPH_DOT: Glyph5 = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
];

export const GLYPH_PLUS: Glyph5 = [
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [1, 1, 1, 1, 1],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
];

export const GLYPH_X: Glyph5 = [
  [1, 0, 0, 0, 1],
  [0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 1, 0, 1, 0],
  [1, 0, 0, 0, 1],
];

export const GLYPH_STAR: Glyph5 = [
  [1, 0, 1, 0, 1],
  [0, 1, 1, 1, 0],
  [1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0],
  [1, 0, 1, 0, 1],
];

export const GLYPH_ASTERISK8: Glyph5 = [
  [0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0],
  [1, 1, 1, 1, 1],
  [0, 0, 1, 0, 0],
  [0, 1, 0, 1, 0],
];

export const GLYPH_CIRCLE: Glyph5 = [
  [0, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0],
];

export const ASCII_CYCLE_GLYPHS: Glyph5[] = [
  GLYPH_DOT,
  GLYPH_PLUS,
  GLYPH_X,
  GLYPH_STAR,
  GLYPH_ASTERISK8,
  GLYPH_CIRCLE,
];

export const GLYPH_CHECK: Glyph5 = [
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1],
  [0, 0, 0, 1, 0],
  [1, 0, 1, 0, 0],
  [0, 1, 0, 0, 0],
];

export const GLYPH_CROSS: Glyph5 = [
  [1, 0, 0, 0, 1],
  [0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0],
  [0, 1, 0, 1, 0],
  [1, 0, 0, 0, 1],
];

export const GLYPH_BANG: Glyph5 = [
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0],
];

// Draw-in order for state icons: cells animate in sequence along this path.
// List of [row, col] pairs. Missing cells default to appearing last.
export const CHECK_DRAW_ORDER: [number, number][] = [
  [3, 0], [4, 1], [3, 2], [2, 3], [1, 4],
];
export const CROSS_DRAW_ORDER: [number, number][] = [
  [0, 0], [1, 1], [2, 2], [3, 3], [4, 4],
  [0, 4], [1, 3], [3, 1], [4, 0],
];
export const BANG_DRAW_ORDER: [number, number][] = [
  [0, 2], [1, 2], [2, 2], [4, 2],
];

// Sample a 5×5 glyph at fractional grid position (0..N-1). Handles N != 5.
export function sampleGlyph(glyph: Glyph5, r: number, c: number, size: number): boolean {
  const gr = Math.min(4, Math.max(0, Math.floor((r / (size - 1)) * 4 + 0.0001)));
  const gc = Math.min(4, Math.max(0, Math.floor((c / (size - 1)) * 4 + 0.0001)));
  return glyph[gr][gc] === 1;
}
