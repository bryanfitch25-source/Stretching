const test = require('node:test');
const assert = require('node:assert/strict');
const { PanScale } = require('./setup');

test('rectangular pan area is width x length', () => {
  assert.equal(PanScale.panArea({ shape: 'rect', width: 9, length: 13 }), 117);
});

test('round pan area is pi r^2', () => {
  const area = PanScale.panArea({ shape: 'round', diameter: 8 });
  assert.ok(Math.abs(area - Math.PI * 16) < 0.001);
});

test('scale factor is targetArea / sourceArea', () => {
  const f = PanScale.panScaleFactor(
    { shape: 'rect', width: 9, length: 13 },
    { shape: 'rect', width: 8, length: 8 },
  );
  assert.ok(Math.abs(f - 64 / 117) < 0.001);
});

test('an incomplete pan falls back to a no-op factor of 1', () => {
  assert.equal(PanScale.panScaleFactor(null, { shape: 'rect', width: 8, length: 8 }), 1);
  assert.equal(PanScale.panScaleFactor({ shape: 'rect', width: 8, length: 8 }, null), 1);
});
