(function () {
  'use strict';

  const el = (sel, root = document) => root.querySelector(sel);
  const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const escapeHtml = (s = '') => s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const appEl = el('#app');
  const detailRoot = el('#detail-root');
  const recipeListEl = el('#recipe-list');
  const searchInput = el('#search-input');
  const shoppingBar = el('#shopping-bar');
  const shoppingCount = el('#shopping-count');

  const State = {
    recipes: [],
    query: '',
    shoppingMode: false,
    selected: new Set(),
    activeRecipeId: null,
    editingId: null, // null = list, 'new' = new recipe, id = editing
    // ephemeral per-recipe view scale state, keyed by recipe id
    viewState: new Map(),
    shoppingList: null,
  };

  function getViewState(recipe) {
    if (!State.viewState.has(recipe.id)) {
      State.viewState.set(recipe.id, {
        mode: 'servings', // 'servings' | 'pan'
        servings: recipe.baseServings,
        unitSystem: null, // null = as written, 'imperial', 'metric'
        sourcePan: recipe.panSize ? { ...recipe.panSize } : { shape: 'rect', width: 9, length: 13 },
        targetPan: recipe.panSize ? { ...recipe.panSize } : { shape: 'rect', width: 9, length: 13 },
      });
    }
    return State.viewState.get(recipe.id);
  }

  function currentFactor(recipe, vs) {
    if (vs.mode === 'pan') {
      return PanScale.panScaleFactor(vs.sourcePan, vs.targetPan);
    }
    const base = recipe.baseServings || 1;
    return (vs.servings || base) / base;
  }

  async function persist() {
    await Storage.saveRecipes(State.recipes);
  }

  function setActivePane(pane) {
    appEl.dataset.activePane = pane;
  }

  // ---------------------------------------------------------------------
  // LIST VIEW
  // ---------------------------------------------------------------------

  function filteredRecipes() {
    const q = State.query.trim().toLowerCase();
    const list = q
      ? State.recipes.filter((r) => r.title.toLowerCase().includes(q))
      : State.recipes;
    return [...list].sort((a, b) => a.title.localeCompare(b.title));
  }

  function renderList() {
    const recipes = filteredRecipes();
    if (recipes.length === 0) {
      recipeListEl.innerHTML = `
        <div class="empty-state">
          <h3>${State.recipes.length === 0 ? 'No recipes yet' : 'No matches'}</h3>
          <p>${State.recipes.length === 0 ? 'Tap the + button to add your first recipe.' : 'Try a different search.'}</p>
        </div>`;
      return;
    }
    recipeListEl.innerHTML = recipes.map((r) => {
      const selected = State.selected.has(r.id);
      return `
      <button class="recipe-card ${selected ? 'selected' : ''}" data-id="${r.id}" role="listitem">
        ${State.shoppingMode ? `<span class="checkbox" aria-hidden="true">${selected ? '✓' : ''}</span>` : ''}
        <span class="recipe-card-body">
          <span class="recipe-card-title">${escapeHtml(r.title)}</span>
          <span class="recipe-card-meta">${r.baseServings} serving${r.baseServings === 1 ? '' : 's'} · ${r.ingredients.length} ingredient${r.ingredients.length === 1 ? '' : 's'}</span>
        </span>
      </button>`;
    }).join('');
  }

  function updateShoppingBar() {
    shoppingBar.classList.toggle('hidden', !State.shoppingMode);
    shoppingCount.textContent = `${State.selected.size} selected`;
    el('#btn-build-shopping-list').disabled = State.selected.size === 0;
  }

  recipeListEl.addEventListener('click', (e) => {
    const card = e.target.closest('.recipe-card');
    if (!card) return;
    const id = card.dataset.id;
    if (State.shoppingMode) {
      if (State.selected.has(id)) State.selected.delete(id); else State.selected.add(id);
      renderList();
      updateShoppingBar();
    } else {
      openDetail(id);
    }
  });

  searchInput.addEventListener('input', (e) => {
    State.query = e.target.value;
    renderList();
  });

  el('#btn-shopping-mode').addEventListener('click', () => {
    State.shoppingMode = true;
    State.selected.clear();
    renderList();
    updateShoppingBar();
  });
  el('#btn-cancel-shopping-mode').addEventListener('click', () => {
    State.shoppingMode = false;
    State.selected.clear();
    renderList();
    updateShoppingBar();
  });
  el('#btn-build-shopping-list').addEventListener('click', () => {
    openShoppingList();
  });
  el('#btn-add-recipe').addEventListener('click', () => openEdit('new'));

  // ---------------------------------------------------------------------
  // DETAIL VIEW
  // ---------------------------------------------------------------------

  function findRecipe(id) {
    return State.recipes.find((r) => r.id === id);
  }

  function openDetail(id) {
    State.activeRecipeId = id;
    State.editingId = null;
    setActivePane('detail');
    renderDetail();
  }

  function renderDetail() {
    const recipe = findRecipe(State.activeRecipeId);
    if (!recipe) {
      detailRoot.className = 'detail-empty';
      detailRoot.innerHTML = '<p>Select a recipe to view it here.</p>';
      return;
    }
    detailRoot.className = '';
    const vs = getViewState(recipe);
    const factor = currentFactor(recipe, vs);

    const scaledIngredients = recipe.ingredients.map((ing) => {
      const r = Units.scaleQuantity(ing.qty, ing.unit, factor, vs.unitSystem);
      return { ...ing, display: r.display, resolvedUnit: r.unit };
    });

    detailRoot.innerHTML = `
      <div class="detail-header">
        <button class="icon-btn" id="btn-back" aria-label="Back to recipes">←</button>
        <h2>${escapeHtml(recipe.title)}</h2>
        <button class="icon-btn" id="btn-edit" aria-label="Edit recipe">✎</button>
        <button class="icon-btn" id="btn-delete" aria-label="Delete recipe">🗑</button>
      </div>
      <div class="detail-body">
        <div class="scale-card">
          <div class="mode-toggle" role="tablist" aria-label="Scaling method">
            <button data-mode="servings" class="${vs.mode === 'servings' ? 'active' : ''}" role="tab" aria-selected="${vs.mode === 'servings'}">By servings</button>
            <button data-mode="pan" class="${vs.mode === 'pan' ? 'active' : ''}" role="tab" aria-selected="${vs.mode === 'pan'}">By pan size</button>
          </div>

          ${vs.mode === 'servings' ? `
            <div class="stepper-row">
              <button class="stepper-btn" id="btn-dec" aria-label="Decrease servings" ${vs.servings <= 1 ? 'disabled' : ''}>−</button>
              <span class="stepper-value">
                <span class="num" id="servings-num">${vs.servings}</span>
                <span class="label">servings</span>
              </span>
              <button class="stepper-btn" id="btn-inc" aria-label="Increase servings">+</button>
            </div>
          ` : `
            <div class="pan-row">
              ${panSelectHtml('sourcePan', vs.sourcePan)}
              <span class="arrow">→</span>
              ${panSelectHtml('targetPan', vs.targetPan)}
            </div>
            <p style="text-align:center; color:var(--ink-soft); font-size:14px; margin:0;">Scaling ×${factor.toFixed(2)} by pan area</p>
          `}

          <div class="unit-toggle" role="group" aria-label="Unit system">
            <button data-unit="" class="${!vs.unitSystem ? 'active' : ''}">As written</button>
            <button data-unit="imperial" class="${vs.unitSystem === 'imperial' ? 'active' : ''}">Imperial</button>
            <button data-unit="metric" class="${vs.unitSystem === 'metric' ? 'active' : ''}">Metric</button>
          </div>
        </div>

        <h3 class="section-title">Ingredients</h3>
        <div>
          ${scaledIngredients.map((ing) => `
            <div class="ingredient-row">
              <span class="qty">${ing.display}</span>
              <span class="unit">${escapeHtml(Units.UNIT_LABELS[ing.resolvedUnit] ?? ing.resolvedUnit ?? '')}</span>
              <span class="name">${escapeHtml(ing.name)}</span>
            </div>
          `).join('')}
        </div>

        <h3 class="section-title">Instructions</h3>
        <div>
          ${recipe.steps.map((s, i) => `
            <div class="step-row">
              <span class="step-num">${i + 1}</span>
              <span>${escapeHtml(s)}</span>
            </div>
          `).join('')}
        </div>

        <div class="detail-actions">
          <button class="btn-primary" id="btn-shop-this">Add to shopping list</button>
        </div>
      </div>
    `;

    el('#btn-back', detailRoot).addEventListener('click', backToList);
    el('#btn-edit', detailRoot).addEventListener('click', () => openEdit(recipe.id));
    el('#btn-delete', detailRoot).addEventListener('click', () => deleteRecipe(recipe.id));
    els('.mode-toggle button', detailRoot).forEach((btn) => btn.addEventListener('click', () => {
      vs.mode = btn.dataset.mode;
      renderDetail();
    }));
    els('.unit-toggle button', detailRoot).forEach((btn) => btn.addEventListener('click', () => {
      vs.unitSystem = btn.dataset.unit || null;
      renderDetail();
    }));

    if (vs.mode === 'servings') {
      el('#btn-inc', detailRoot).addEventListener('click', () => { vs.servings += 1; renderDetail(); });
      el('#btn-dec', detailRoot).addEventListener('click', () => { if (vs.servings > 1) { vs.servings -= 1; renderDetail(); } });
    } else {
      el('#sourcePan-shape', detailRoot).addEventListener('change', () => onPanFieldChange(vs, 'sourcePan'));
      el('#targetPan-shape', detailRoot).addEventListener('change', () => onPanFieldChange(vs, 'targetPan'));
      els('[data-pan]', detailRoot).forEach((input) => input.addEventListener('input', () => onPanFieldChange(vs, input.dataset.pan)));
    }

    el('#btn-shop-this', detailRoot).addEventListener('click', () => {
      openShoppingList([{ recipe, factor, unitSystem: vs.unitSystem }]);
    });
  }

  function panSelectHtml(key, pan) {
    return `
      <div>
        <select id="${key}-shape" data-pan="${key}" aria-label="${key === 'sourcePan' ? 'Source' : 'Target'} pan shape">
          <option value="rect" ${pan.shape === 'rect' ? 'selected' : ''}>Rectangular</option>
          <option value="round" ${pan.shape === 'round' ? 'selected' : ''}>Round</option>
        </select>
        ${pan.shape === 'round' ? `
          <input type="number" min="1" step="0.5" data-pan="${key}" class="pan-num" value="${pan.diameter ?? 9}" aria-label="Diameter in inches" style="width:70px; min-height:44px; border-radius:10px; border:2px solid var(--line);">
        ` : `
          <input type="number" min="1" step="0.5" data-pan="${key}" class="pan-num pan-w" value="${pan.width ?? 9}" aria-label="Width in inches" style="width:60px; min-height:44px; border-radius:10px; border:2px solid var(--line);">
          ×
          <input type="number" min="1" step="0.5" data-pan="${key}" class="pan-num pan-l" value="${pan.length ?? 13}" aria-label="Length in inches" style="width:60px; min-height:44px; border-radius:10px; border:2px solid var(--line);">
        `}
      </div>`;
  }

  function onPanFieldChange(vs, key) {
    const container = detailRoot;
    const shape = el(`#${key}-shape`, container).value;
    const pan = { shape };
    if (shape === 'round') {
      const d = el(`[data-pan="${key}"].pan-num`, container);
      pan.diameter = parseFloat(d?.value) || 9;
    } else {
      const w = el(`[data-pan="${key}"].pan-w`, container);
      const l = el(`[data-pan="${key}"].pan-l`, container);
      pan.width = parseFloat(w?.value) || 9;
      pan.length = parseFloat(l?.value) || 13;
    }
    vs[key] = pan;
    renderDetail();
  }

  function backToList() {
    State.activeRecipeId = null;
    setActivePane('list');
    renderDetail();
  }

  async function deleteRecipe(id) {
    const recipe = findRecipe(id);
    if (!recipe) return;
    if (!window.confirm(`Delete "${recipe.title}"? This can't be undone.`)) return;
    State.recipes = State.recipes.filter((r) => r.id !== id);
    await persist();
    backToList();
    renderList();
  }

  // ---------------------------------------------------------------------
  // EDIT / ADD FORM
  // ---------------------------------------------------------------------

  function blankRecipe() {
    return {
      id: Storage.newId(),
      title: '',
      baseServings: 4,
      panSize: null,
      ingredients: [{ id: Storage.newId(), name: '', qty: 1, unit: '' }],
      steps: [''],
    };
  }

  function openEdit(id) {
    State.editingId = id;
    setActivePane('edit');
    renderEdit();
  }

  function renderEdit() {
    const isNew = State.editingId === 'new';
    const original = isNew ? blankRecipe() : findRecipe(State.editingId);
    if (!original) { backToList(); return; }
    // work on a deep copy so cancel doesn't mutate state
    const draft = JSON.parse(JSON.stringify(original));

    function renderForm() {
      detailRoot.className = '';
      detailRoot.innerHTML = `
        <div class="detail-header">
          <button class="icon-btn" id="btn-cancel-edit" aria-label="Cancel">←</button>
          <h2>${isNew ? 'New recipe' : 'Edit recipe'}</h2>
          <button class="icon-btn" id="btn-save" aria-label="Save recipe">✓</button>
        </div>
        <div class="form-body">
          <label class="field-label" for="f-title">Title</label>
          <input type="text" id="f-title" value="${escapeHtml(draft.title)}" placeholder="Grandma's chili" autocomplete="off">

          <label class="field-label" for="f-servings">Base servings</label>
          <input type="number" id="f-servings" min="1" step="1" value="${draft.baseServings}">

          <h3 class="section-title">Ingredients</h3>
          <div id="ing-rows">
            ${draft.ingredients.map((ing, i) => ingredientRowHtml(ing, i)).join('')}
          </div>
          <button class="add-row-btn" id="btn-add-ing">+ Add ingredient</button>

          <h3 class="section-title">Instructions</h3>
          <div id="step-rows">
            ${draft.steps.map((s, i) => stepRowHtml(s, i)).join('')}
          </div>
          <button class="add-row-btn" id="btn-add-step">+ Add step</button>
        </div>
      `;

      el('#btn-cancel-edit', detailRoot).addEventListener('click', () => {
        if (isNew) { backToList(); } else { openDetail(original.id); }
      });
      el('#btn-save', detailRoot).addEventListener('click', onSave);
      el('#btn-add-ing', detailRoot).addEventListener('click', () => {
        draft.ingredients.push({ id: Storage.newId(), name: '', qty: 1, unit: '' });
        renderForm();
      });
      el('#btn-add-step', detailRoot).addEventListener('click', () => {
        draft.steps.push('');
        renderForm();
      });
      els('.ingredient-edit-row', detailRoot).forEach((row) => {
        const idx = Number(row.dataset.idx);
        el('.ing-name', row).addEventListener('input', (e) => { draft.ingredients[idx].name = e.target.value; });
        el('.ing-qty', row).addEventListener('input', (e) => { draft.ingredients[idx].qty = parseFloat(e.target.value) || 0; });
        el('.ing-unit', row).addEventListener('change', (e) => { draft.ingredients[idx].unit = e.target.value; });
        el('.row-remove', row).addEventListener('click', () => {
          draft.ingredients.splice(idx, 1);
          renderForm();
        });
      });
      els('.step-edit-row', detailRoot).forEach((row) => {
        const idx = Number(row.dataset.idx);
        el('.step-text', row).addEventListener('input', (e) => { draft.steps[idx] = e.target.value; });
        el('.row-remove', row).addEventListener('click', () => {
          draft.steps.splice(idx, 1);
          renderForm();
        });
      });
    }

    async function onSave() {
      draft.title = el('#f-title', detailRoot).value.trim() || 'Untitled recipe';
      draft.baseServings = Math.max(1, parseInt(el('#f-servings', detailRoot).value, 10) || 1);
      draft.ingredients = draft.ingredients.filter((i) => i.name.trim());
      draft.steps = draft.steps.filter((s) => s.trim());

      const idx = State.recipes.findIndex((r) => r.id === draft.id);
      if (idx >= 0) State.recipes[idx] = draft; else State.recipes.push(draft);
      State.viewState.delete(draft.id);
      await persist();
      renderList();
      openDetail(draft.id);
    }

    renderForm();
  }

  function ingredientRowHtml(ing, i) {
    return `
      <div class="ingredient-edit-row" data-idx="${i}">
        <input type="number" class="ing-qty" min="0" step="0.125" value="${ing.qty}" aria-label="Quantity">
        <select class="ing-unit" aria-label="Unit">
          ${Units.ALL_UNITS.map((u) => `<option value="${u}" ${u === ing.unit ? 'selected' : ''}>${u === '' ? '—' : Units.UNIT_LABELS[u]}</option>`).join('')}
        </select>
        <input type="text" class="ing-name" value="${escapeHtml(ing.name)}" placeholder="flour" aria-label="Ingredient name">
        <button class="row-remove" aria-label="Remove ingredient">×</button>
      </div>`;
  }

  function stepRowHtml(step, i) {
    return `
      <div class="step-edit-row" data-idx="${i}">
        <span class="step-num">${i + 1}</span>
        <textarea class="step-text" placeholder="Preheat oven to 350°F…" aria-label="Step ${i + 1}">${escapeHtml(step)}</textarea>
        <button class="row-remove" aria-label="Remove step">×</button>
      </div>`;
  }

  // ---------------------------------------------------------------------
  // SHOPPING LIST VIEW
  // ---------------------------------------------------------------------

  function openShoppingList(explicitEntries) {
    let entries = explicitEntries;
    if (!entries) {
      entries = [...State.selected].map((id) => {
        const recipe = findRecipe(id);
        const vs = getViewState(recipe);
        return { recipe, factor: currentFactor(recipe, vs), unitSystem: vs.unitSystem };
      });
    }
    const items = [];
    for (const { recipe, factor, unitSystem } of entries) {
      for (const ing of recipe.ingredients) {
        const r = Units.scaleQuantity(ing.qty, ing.unit, factor, unitSystem);
        items.push({ name: ing.name, qty: r.qty, unit: r.unit, recipeTitle: recipe.title });
      }
    }
    State.shoppingList = Shopping.buildShoppingList(items);
    State.shoppingMode = false;
    State.selected.clear();
    renderList();
    updateShoppingBar();
    State.editingId = null;
    State.activeRecipeId = null;
    setActivePane('shopping');
    renderShoppingList();
  }

  function renderShoppingList() {
    detailRoot.className = '';
    const list = State.shoppingList || [];
    detailRoot.innerHTML = `
      <div class="detail-header">
        <button class="icon-btn" id="btn-back-shop" aria-label="Back to recipes">←</button>
        <h2>Shopping list</h2>
        <button class="icon-btn" id="btn-share" aria-label="Share list">↗</button>
      </div>
      <div class="detail-body">
        ${list.length === 0 ? '<p class="empty-state">Nothing here.</p>' : list.map((item, i) => `
          <div class="shopping-item ${item.checked ? 'checked' : ''}" data-idx="${i}">
            <span class="checkbox" aria-hidden="true">${item.checked ? '✓' : ''}</span>
            <span class="item-text"><span class="qty">${item.qtyDisplay}${item.unit ? ' ' + escapeHtml(Units.UNIT_LABELS[item.unit] ?? item.unit) : ''}</span> ${escapeHtml(item.name)}</span>
          </div>
        `).join('')}
        <div class="detail-actions">
          <button class="btn-primary" id="btn-share-2">Share / export as text</button>
        </div>
      </div>
    `;
    el('#btn-back-shop', detailRoot).addEventListener('click', backToList);
    els('.shopping-item', detailRoot).forEach((row) => row.addEventListener('click', () => {
      const idx = Number(row.dataset.idx);
      list[idx].checked = !list[idx].checked;
      renderShoppingList();
    }));
    el('#btn-share', detailRoot).addEventListener('click', shareList);
    el('#btn-share-2', detailRoot).addEventListener('click', shareList);
  }

  async function shareList() {
    const text = Shopping.shoppingListToText(State.shoppingList || [], 'Shopping List');
    const shareNative = window.Capacitor?.Plugins?.Share;
    try {
      if (shareNative) {
        await shareNative.share({ title: 'Shopping List', text });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: 'Shopping List', text });
        return;
      }
    } catch {
      // user cancelled the share sheet — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(text);
      window.alert('Shopping list copied to clipboard.');
    } catch {
      window.prompt('Copy your shopping list:', text);
    }
  }

  // ---------------------------------------------------------------------
  // BOOT
  // ---------------------------------------------------------------------

  async function boot() {
    State.recipes = await Storage.loadRecipes();
    if (State.recipes.length === 0) {
      State.recipes = seedRecipes();
      await persist();
    }
    renderList();
    updateShoppingBar();
    renderDetail();
  }

  function seedRecipes() {
    return [
      {
        id: Storage.newId(),
        title: 'Weeknight Chili',
        baseServings: 6,
        panSize: null,
        ingredients: [
          { id: Storage.newId(), name: 'ground beef', qty: 1, unit: 'lb' },
          { id: Storage.newId(), name: 'kidney beans, drained', qty: 2, unit: '' },
          { id: Storage.newId(), name: 'diced tomatoes', qty: 28, unit: 'oz' },
          { id: Storage.newId(), name: 'chili powder', qty: 2, unit: 'tbsp' },
          { id: Storage.newId(), name: 'onion, diced', qty: 1, unit: '' },
          { id: Storage.newId(), name: 'beef broth', qty: 1, unit: 'cup' },
        ],
        steps: [
          'Brown the beef with the onion over medium-high heat, about 6 minutes.',
          'Stir in chili powder and cook 1 minute until fragrant.',
          'Add tomatoes, beans, and broth. Bring to a simmer.',
          'Simmer uncovered 25–30 minutes, stirring occasionally, until thickened.',
        ],
      },
      {
        id: Storage.newId(),
        title: 'Classic Birthday Cake',
        baseServings: 12,
        panSize: { shape: 'rect', width: 9, length: 13 },
        ingredients: [
          { id: Storage.newId(), name: 'all-purpose flour', qty: 2.5, unit: 'cup' },
          { id: Storage.newId(), name: 'sugar', qty: 2, unit: 'cup' },
          { id: Storage.newId(), name: 'butter, softened', qty: 1, unit: 'cup' },
          { id: Storage.newId(), name: 'eggs', qty: 4, unit: '' },
          { id: Storage.newId(), name: 'milk', qty: 1, unit: 'cup' },
          { id: Storage.newId(), name: 'baking powder', qty: 2.5, unit: 'tsp' },
          { id: Storage.newId(), name: 'vanilla extract', qty: 2, unit: 'tsp' },
        ],
        steps: [
          'Preheat oven to 350°F (175°C). Grease the pan.',
          'Cream butter and sugar until light and fluffy.',
          'Beat in eggs one at a time, then vanilla.',
          'Whisk flour and baking powder together; add alternately with milk.',
          'Pour into pan and bake 30–35 minutes, until a toothpick comes out clean.',
        ],
      },
    ];
  }

  boot();
})();
