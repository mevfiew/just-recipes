const RECIPES_KEY = 'recipes';
const MAX_RECIPES = 5000;

async function readObj() {
  const out = await chrome.storage.local.get(RECIPES_KEY);
  return out[RECIPES_KEY] || {};
}

async function writeObj(obj) {
  await chrome.storage.local.set({ [RECIPES_KEY]: obj });
}

export async function loadAll() {
  const obj = await readObj();
  const values = Object.values(obj);
  values.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  return values;
}

export async function loadOne(recipeId) {
  const obj = await readObj();
  return obj[recipeId] || null;
}

export async function save(recipe) {
  const obj = await readObj();
  obj[recipe.recipeId] = recipe;
  const keys = Object.keys(obj);
  if (keys.length > MAX_RECIPES) {
    const sorted = Object.values(obj).sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
    while (sorted.length > MAX_RECIPES) {
      const dropped = sorted.shift();
      delete obj[dropped.recipeId];
    }
  }
  await writeObj(obj);
}

export async function remove(recipeId) {
  const obj = await readObj();
  delete obj[recipeId];
  await writeObj(obj);
}

export async function clearAll() {
  await chrome.storage.local.set({ [RECIPES_KEY]: {} });
}

export async function countAll() {
  const obj = await readObj();
  return Object.keys(obj).length;
}
