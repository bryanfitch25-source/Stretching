// Combine ingredients from multiple (already-scaled) recipes into one
// deduplicated shopping list. Ingredients with the same normalized name
// AND the same unit family (volume / weight / exact "other" unit) are
// summed; everything else is listed as separate lines under that name.

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function buildShoppingList(items) {
  // items: [{ name, qty, unit, recipeTitle }]
  const groups = new Map();

  for (const item of items) {
    const key = normalizeName(item.name);
    if (!groups.has(key)) groups.set(key, { name: item.name.trim(), buckets: new Map() });
    const group = groups.get(key);

    const family = Units.unitFamily(item.unit);
    const bucketKey = family === 'other' ? `other:${item.unit}` : `family:${family}:${Units.unitSystem(item.unit)}`;

    if (!group.buckets.has(bucketKey)) {
      group.buckets.set(bucketKey, { family, unit: item.unit, baseQty: 0 });
    }
    const bucket = group.buckets.get(bucketKey);

    if (family === 'volume') {
      bucket.baseQty += item.qty * Units.VOLUME_TO_ML[item.unit];
    } else if (family === 'weight') {
      bucket.baseQty += item.qty * Units.WEIGHT_TO_G[item.unit];
    } else {
      bucket.baseQty += item.qty;
    }
  }

  const lines = [];
  for (const { name, buckets } of groups.values()) {
    for (const bucket of buckets.values()) {
      let final;
      if (bucket.family === 'volume') {
        final = Units.finalizeQuantity(bucket.baseQty / Units.VOLUME_TO_ML[bucket.unit], bucket.unit);
      } else if (bucket.family === 'weight') {
        final = Units.finalizeQuantity(bucket.baseQty / Units.WEIGHT_TO_G[bucket.unit], bucket.unit);
      } else {
        const r = Math.round(bucket.baseQty * 100) / 100;
        final = { display: `${r}`, unit: bucket.unit };
      }
      lines.push({ name, qtyDisplay: final.display, unit: bucket.unit, checked: false });
    }
  }

  lines.sort((a, b) => a.name.localeCompare(b.name));
  return lines;
}

function shoppingListToText(lines, title = 'Shopping List') {
  const rows = lines.map((l) => {
    const unitLabel = l.unit ? ` ${Units.UNIT_LABELS[l.unit] ?? l.unit}` : '';
    return `- ${l.qtyDisplay}${unitLabel} ${l.name}`.trim();
  });
  return `${title}\n${'-'.repeat(title.length)}\n${rows.join('\n')}`;
}

window.Shopping = { buildShoppingList, shoppingListToText };
