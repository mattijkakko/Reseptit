const DB_KEY = 'reseptikirja_v1';

function getRecipes() {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); }
  catch { return []; }
}

function saveRecipes(recipes) {
  localStorage.setItem(DB_KEY, JSON.stringify(recipes));
}

function getRecipe(id) {
  return getRecipes().find(r => r.id === id) || null;
}

function upsertRecipe(recipe) {
  const all = getRecipes();
  const idx = all.findIndex(r => r.id === recipe.id);
  if (idx >= 0) all[idx] = recipe;
  else all.unshift(recipe);
  saveRecipes(all);
  return recipe;
}

function deleteRecipe(id) {
  saveRecipes(getRecipes().filter(r => r.id !== id));
}

function searchRecipes(query) {
  const all = getRecipes();
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter(r => {
    if (r.title.toLowerCase().includes(q)) return true;
    if (r.tags?.some(t => t.toLowerCase().includes(q))) return true;
    return r.sections?.some(s =>
      s.name?.toLowerCase().includes(q) ||
      s.ingredients?.some(i => i.name?.toLowerCase().includes(q))
    );
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getApiKey() { return localStorage.getItem('anthropic_api_key') || ''; }
function setApiKey(k) { localStorage.setItem('anthropic_api_key', k); }
