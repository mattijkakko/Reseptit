document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) return (location.href = 'index.html');

  const recipe = getRecipe(id);
  if (!recipe) return (location.href = 'index.html');

  let currentServings = recipe.servings || null;
  const baseServings = currentServings;

  render();

  document.getElementById('btn-edit').addEventListener('click', () => {
    location.href = `lisaa.html?id=${id}`;
  });
  document.getElementById('btn-delete').addEventListener('click', () => {
    if (confirm(`Poistetaanko resepti "${recipe.title}"?`)) {
      deleteRecipe(id);
      location.href = 'index.html';
    }
  });

  const btnMinus = document.getElementById('btn-servings-minus');
  const btnPlus  = document.getElementById('btn-servings-plus');
  if (btnMinus && btnPlus) {
    btnMinus.addEventListener('click', () => { if (currentServings > 1) { currentServings--; renderIngredients(); updateServingsDisplay(); } });
    btnPlus.addEventListener('click',  () => { currentServings++; renderIngredients(); updateServingsDisplay(); });
  }

  function updateServingsDisplay() {
    document.getElementById('servings-value').textContent = currentServings;
  }

  function scaleAmount(raw) {
    if (!baseServings || baseServings === currentServings) return raw;
    const num = parseFloat(raw.replace(',', '.'));
    if (isNaN(num)) return raw;
    const scaled = (num / baseServings) * currentServings;
    const result = Math.round(scaled * 100) / 100;
    return String(result).replace('.', ',');
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = String(s ?? '');
    return d.innerHTML;
  }

  function renderIngredients() {
    const el = document.getElementById('ingredients');
    el.innerHTML = '';
    for (const section of (recipe.sections || [])) {
      if (section.name) {
        const h = document.createElement('div');
        h.className = 'section-name';
        h.textContent = section.name;
        el.appendChild(h);
      }
      const table = document.createElement('table');
      table.className = 'ingredients-table';
      for (const ing of (section.ingredients || [])) {
        const tr = document.createElement('tr');
        const amt = [scaleAmount(ing.amount || ''), ing.unit].filter(Boolean).join(' ');
        tr.innerHTML = `<td class="amt">${esc(amt)}</td><td>${esc(ing.name)}</td>`;
        table.appendChild(tr);
      }
      el.appendChild(table);
    }
  }

  function render() {
    document.title = recipe.title + ' – Reseptikirja';
    document.getElementById('recipe-title').textContent = recipe.title;

    const servingsEl = document.getElementById('servings-control');
    if (currentServings) {
      servingsEl.hidden = false;
      document.getElementById('servings-value').textContent = currentServings;
      document.getElementById('servings-unit').textContent = recipe.servingsUnit || 'annosta';
    } else {
      servingsEl.hidden = true;
    }

    renderIngredients();

    const ol = document.querySelector('.instructions-list');
    ol.innerHTML = '';
    for (const step of (recipe.instructions || [])) {
      const li = document.createElement('li');
      li.textContent = step;
      ol.appendChild(li);
    }

    const notesEl = document.getElementById('notes-section');
    if (recipe.notes) {
      notesEl.hidden = false;
      document.getElementById('notes-text').textContent = recipe.notes;
    }

    const tagsEl = document.getElementById('recipe-tags');
    if (recipe.tags?.length) {
      tagsEl.innerHTML = recipe.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('');
    }

    const dateEl = document.getElementById('recipe-date');
    if (recipe.createdAt) {
      dateEl.textContent = new Date(recipe.createdAt).toLocaleDateString('fi-FI');
    }
  }
});
