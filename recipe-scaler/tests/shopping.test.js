const test = require('node:test');
const assert = require('node:assert/strict');
const { Shopping } = require('./setup');

test('sums the same ingredient+unit-family across recipes, case/whitespace insensitive', () => {
  const list = Shopping.buildShoppingList([
    { name: 'flour', qty: 1, unit: 'cup' },
    { name: '  Flour  ', qty: 0.5, unit: 'cup' },
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'flour');
  assert.equal(list[0].qtyDisplay, '1 1/2');
});

test('keeps unitless "other" items with different unit strings as separate lines', () => {
  const list = Shopping.buildShoppingList([
    { name: 'garlic', qty: 1, unit: 'clove' },
    { name: 'garlic', qty: 1, unit: 'head' },
  ]);
  assert.equal(list.length, 2);
});

test('does not merge a volume unit with a weight unit for the same ingredient', () => {
  const list = Shopping.buildShoppingList([
    { name: 'butter', qty: 1, unit: 'cup' },
    { name: 'butter', qty: 4, unit: 'oz' },
  ]);
  assert.equal(list.length, 2);
});

test('renders a readable plain-text export', () => {
  const list = [{ name: 'eggs', qtyDisplay: '3', unit: '' }];
  const text = Shopping.shoppingListToText(list, 'Shopping List');
  assert.match(text, /Shopping List/);
  assert.match(text, /- 3 eggs/);
});
