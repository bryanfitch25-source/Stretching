const test = require('node:test');
const assert = require('node:assert/strict');
const { Units } = require('./setup');

test('scales a quantity proportionally, keeping the written unit', () => {
  const r = Units.scaleQuantity(1, 'cup', 2, null);
  assert.equal(r.qty, 2);
  assert.equal(r.unit, 'cup');
  assert.equal(r.display, '2');
});

test('rounds imperial volume to the nearest 1/8 and formats as a fraction', () => {
  const r = Units.scaleQuantity(1, 'tsp', 0.33, null); // 0.33 tsp -> nearest 1/8 -> 3/8
  assert.equal(r.qty, 0.375);
  assert.equal(r.display, '3/8');
});

test('converts cup -> metric, picking ml for a small quantity', () => {
  const r = Units.scaleQuantity(1, 'cup', 1, 'metric');
  assert.equal(r.unit, 'ml');
  assert.equal(r.display, '237');
});

test('converts a large metric volume to the largest imperial unit (cup)', () => {
  const r = Units.scaleQuantity(2, 'l', 1, 'imperial'); // 2000ml -> imperial
  assert.equal(r.unit, 'cup');
});

test('a metric volume >= 1000ml converts to liters, not ml', () => {
  const r = Units.scaleQuantity(500, 'ml', 3, null); // 1500ml, no target system -> stays ml, just scaled
  assert.equal(r.unit, 'ml');
  const converted = Units.scaleQuantity(500, 'ml', 3, 'metric'); // forced through pickBestUnit
  assert.equal(converted.unit, 'l');
});

test('never crosses volume and weight families', () => {
  // "cup" of flour scaled/converted to imperial should stay a volume unit,
  // never accidentally become oz/lb (density-dependent, we don't guess it)
  const r = Units.scaleQuantity(1, 'cup', 1, 'imperial');
  assert.equal(Units.unitFamily(r.unit), 'volume');
});

test('leaves "other" units (count, unitless) untouched, only scaling the number', () => {
  const r = Units.scaleQuantity(2, '', 1.5, 'metric');
  assert.equal(r.unit, '');
  assert.equal(r.display, '3');
});

test('picks the friendliest metric weight unit (kg once >= 1000g)', () => {
  const r = Units.scaleQuantity(1200, 'g', 1, null);
  assert.equal(r.unit, 'g'); // no target system given -> stays in its own unit, just scaled
  assert.equal(r.display, '1200');
});

test('weight conversion picks lb once the ounce value would exceed 16', () => {
  const r = Units.scaleQuantity(2, 'lb', 1, 'imperial'); // already imperial, no-op conversion
  assert.equal(r.unit, 'lb');
  assert.equal(r.qty, 2);
});
