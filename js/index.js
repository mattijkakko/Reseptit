document.addEventListener('DOMContentLoaded', () => {
  const searchEl = document.getElementById('search');
  const gridEl   = document.getElementById('recipe-grid');
  const countEl  = document.getElementById('recipe-count');
  const emptyEl  = document.getElementById('empty-state');

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function render(recipes) {
    countEl.textContent = recipes.length ? `${recipes.length} reseptiä` : '';
    if (!recipes.length) {
      gridEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    gridEl.innerHTML = recipes.map(r => `
      <a href="resepti.html?id=${r.id}" class="card">
        <div class="card-title">${esc(r.title)}</div>
        <div class="card-meta">${r.servings ? esc(r.servings) + ' ' + esc(r.servingsUnit || 'annosta') : '&nbsp;'}</div>
        ${r.tags?.length ? `<div class="tags">${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      </a>
    `).join('');
  }

  let timer;
  searchEl.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => render(searchRecipes(searchEl.value)), 180);
  });

  render(getRecipes());
});
