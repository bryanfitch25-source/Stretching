// Pan-size scaling: quantities scale by the ratio of pan area (or volume,
// for the rare case of two different pan "depths") between a source and
// target pan, instead of by a servings ratio.

function panArea(pan) {
  if (!pan) return null;
  if (pan.shape === 'round') {
    const r = pan.diameter / 2;
    return Math.PI * r * r;
  }
  // rectangular / square
  return pan.width * pan.length;
}

/**
 * factor = targetArea / sourceArea. If either pan is incomplete, returns 1
 * (no-op) so callers can safely multiply by it.
 */
function panScaleFactor(sourcePan, targetPan) {
  const a = panArea(sourcePan);
  const b = panArea(targetPan);
  if (!a || !b || a <= 0) return 1;
  return b / a;
}

const COMMON_PANS = [
  { label: '8" round', shape: 'round', diameter: 8 },
  { label: '9" round', shape: 'round', diameter: 9 },
  { label: '9x13 in', shape: 'rect', width: 9, length: 13 },
  { label: '8x8 in', shape: 'rect', width: 8, length: 8 },
  { label: '9x9 in', shape: 'rect', width: 9, length: 9 },
  { label: '10x15 in (half sheet)', shape: 'rect', width: 10, length: 15 },
  { label: '9x5 loaf', shape: 'rect', width: 9, length: 5 },
];

window.PanScale = { panArea, panScaleFactor, COMMON_PANS };
