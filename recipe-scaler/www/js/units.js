// Unit conversion + fraction/decimal rounding for ingredient scaling.
//
// Rules (deliberately conservative):
//  - We only ever convert *within* a measurement family: volume<->volume or
//    weight<->weight. We never guess a volume<->weight conversion (that
//    depends on the ingredient's density, which we don't know), and we
//    never touch "other" units (count, "pinch", "clove", etc.) beyond
//    scaling the number.
//  - Imperial quantities round to the nearest 1/8 and are displayed as
//    mixed fractions (people measure with 1/8 cup, 1/4 tsp, etc).
//  - Metric quantities round to the nearest whole gram/ml for small
//    amounts, or 2 decimals for kg/l.

const VOLUME_TO_ML = { tsp: 4.92892, tbsp: 14.7868, cup: 236.588, ml: 1, l: 1000 };
const WEIGHT_TO_G = { oz: 28.3495, lb: 453.592, g: 1, kg: 1000 };

const IMPERIAL_VOLUME = ['tsp', 'tbsp', 'cup'];
const METRIC_VOLUME = ['ml', 'l'];
const IMPERIAL_WEIGHT = ['oz', 'lb'];
const METRIC_WEIGHT = ['g', 'kg'];

const UNIT_LABELS = {
  tsp: 'tsp', tbsp: 'tbsp', cup: 'cup', oz: 'oz', lb: 'lb',
  g: 'g', kg: 'kg', ml: 'ml', l: 'l', '': '',
};

const ALL_UNITS = ['', 'tsp', 'tbsp', 'cup', 'g', 'kg', 'oz', 'lb', 'ml', 'l'];

function unitFamily(unit) {
  if (VOLUME_TO_ML[unit] !== undefined) return 'volume';
  if (WEIGHT_TO_G[unit] !== undefined) return 'weight';
  return 'other';
}

function unitSystem(unit) {
  if (IMPERIAL_VOLUME.includes(unit) || IMPERIAL_WEIGHT.includes(unit)) return 'imperial';
  if (METRIC_VOLUME.includes(unit) || METRIC_WEIGHT.includes(unit)) return 'metric';
  return null;
}

function roundToEighth(n) {
  return Math.round(n * 8) / 8;
}

// Nice mixed-fraction string for imperial quantities, e.g. 1.375 -> "1 3/8"
function formatFraction(n) {
  const rounded = roundToEighth(n);
  const whole = Math.floor(rounded);
  let eighths = Math.round((rounded - whole) * 8);
  let w = whole;
  if (eighths === 8) { w += 1; eighths = 0; }
  if (eighths === 0) return `${w}`;
  const fracMap = {
    1: '1/8', 2: '1/4', 3: '3/8', 4: '1/2', 5: '5/8', 6: '3/4', 7: '7/8',
  };
  const frac = fracMap[eighths];
  return w > 0 ? `${w} ${frac}` : frac;
}

function formatMetric(n, unit) {
  if (unit === 'kg' || unit === 'l') {
    const r = Math.round(n * 100) / 100;
    return r % 1 === 0 ? `${r}` : `${r}`;
  }
  return `${Math.round(n)}`;
}

// Pick the friendliest unit within `candidates` for a base quantity
// (ml for volume, g for weight), preferring a value >= 1 in the largest
// unit, and never showing something absurd like "0.02 cup".
function pickBestUnit(baseQty, candidates, toBaseMap) {
  const sorted = [...candidates].sort((a, b) => toBaseMap[b] - toBaseMap[a]);
  for (const unit of sorted) {
    const qty = baseQty / toBaseMap[unit];
    if (qty >= 1 || unit === sorted[sorted.length - 1]) {
      return { unit, qty };
    }
  }
  const fallback = sorted[sorted.length - 1];
  return { unit: fallback, qty: baseQty / toBaseMap[fallback] };
}

/**
 * Scale one ingredient quantity by `factor`, optionally converting to a
 * target measurement system ('imperial' | 'metric' | null = keep as-is).
 * Returns { qty: number, unit: string, display: string }.
 */
function scaleQuantity(qty, unit, factor, targetSystem = null) {
  const scaled = qty * factor;
  const family = unitFamily(unit);

  if (family === 'other' || !unit) {
    const r = Math.round(scaled * 100) / 100;
    return { qty: r, unit, display: `${r % 1 === 0 ? r : r.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}` };
  }

  // An explicit system selection ("Imperial"/"Metric") re-picks the
  // friendliest unit even within the same system (e.g. 1500ml -> 1.5l).
  // "As written" (targetSystem === null) always keeps the original unit.
  if (targetSystem) {
    const toBase = family === 'volume' ? VOLUME_TO_ML : WEIGHT_TO_G;
    const baseQty = scaled * toBase[unit];
    const candidates = family === 'volume'
      ? (targetSystem === 'imperial' ? IMPERIAL_VOLUME : METRIC_VOLUME)
      : (targetSystem === 'imperial' ? IMPERIAL_WEIGHT : METRIC_WEIGHT);
    const { unit: bestUnit, qty: bestQty } = pickBestUnit(baseQty, candidates, toBase);
    return finalizeQuantity(bestQty, bestUnit);
  }

  return finalizeQuantity(scaled, unit);
}

function finalizeQuantity(qty, unit) {
  const system = unitSystem(unit);
  if (system === 'imperial') {
    return { qty: roundToEighth(qty), unit, display: formatFraction(qty) };
  }
  if (system === 'metric') {
    return { qty: Math.round(qty * 100) / 100, unit, display: formatMetric(qty, unit) };
  }
  const r = Math.round(qty * 100) / 100;
  return { qty: r, unit, display: `${r}` };
}

window.Units = {
  ALL_UNITS,
  UNIT_LABELS,
  unitFamily,
  unitSystem,
  scaleQuantity,
  finalizeQuantity,
  VOLUME_TO_ML,
  WEIGHT_TO_G,
};
