import { extractRecipeFromHtml, canonicalizeUrl } from './lib/parser.js';
import * as store from './lib/storage.js';

const detectEl = document.getElementById('detect');
const listEl = document.getElementById('list');
const statsEl = document.getElementById('stats');
const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');

let allRecipes = [];
let currentSearch = '';

function safeHttpUrl(url) {
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
  } catch { return ''; }
}

async function sha1Hex(input) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function detectOnActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab?.url?.startsWith('http')) return null;
  let results;
  try {
    results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({ html: document.documentElement.outerHTML, url: location.href })
    });
  } catch { return null; }
  const data = results?.[0]?.result;
  if (!data?.html) return null;
  const recipe = extractRecipeFromHtml(data.html, data.url);
  if (!recipe) return null;
  return { recipe, tabUrl: data.url };
}

function matchesSearch(r, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (r.name?.toLowerCase().includes(needle)) return true;
  if (r.cuisine?.toLowerCase().includes(needle)) return true;
  if (r.category?.toLowerCase().includes(needle)) return true;
  if (r.author?.toLowerCase().includes(needle)) return true;
  if (r.ingredients?.some(i => i.toLowerCase().includes(needle))) return true;
  if (r.keywords?.some(k => k.toLowerCase().includes(needle))) return true;
  return false;
}

function openViewer(recipeId) {
  const url = chrome.runtime.getURL('src/viewer.html') + '?id=' + encodeURIComponent(recipeId);
  chrome.tabs.create({ url });
}

function openOriginal(sourceUrl) {
  const safe = safeHttpUrl(sourceUrl);
  if (safe) chrome.tabs.create({ url: safe });
}

function createBadge(text) {
  const span = document.createElement('span');
  span.className = 'badge';
  span.textContent = text;
  return span;
}

function createCard(recipe) {
  const card = document.createElement('div');
  card.className = 'card';

  const img = document.createElement('img');
  const safeImg = safeHttpUrl(recipe.imageUrl);
  if (safeImg) img.src = safeImg;
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('click', () => openViewer(recipe.recipeId));
  card.appendChild(img);

  const info = document.createElement('div');
  info.className = 'card-info';
  info.addEventListener('click', () => openViewer(recipe.recipeId));

  const name = document.createElement('div');
  name.className = 'card-name';
  name.textContent = recipe.name || '(untitled)';
  info.appendChild(name);

  const badges = document.createElement('div');
  badges.className = 'card-badges';
  if (recipe.totalTimeMin > 0) badges.appendChild(createBadge(recipe.totalTimeMin + ' min'));
  if (recipe.cuisine) badges.appendChild(createBadge(recipe.cuisine));
  if (recipe.category) badges.appendChild(createBadge(recipe.category));
  if (recipe.hostname) badges.appendChild(createBadge(recipe.hostname.replace(/^www\./, '')));
  info.appendChild(badges);
  card.appendChild(info);

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.textContent = '\u2197';
  openBtn.title = 'Open original';
  openBtn.addEventListener('click', () => openOriginal(recipe.sourceUrl));

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.textContent = '\u2715';
  delBtn.title = 'Delete';
  delBtn.addEventListener('click', async () => {
    if (!confirm(`Delete "${recipe.name}"?`)) return;
    await store.remove(recipe.recipeId);
    allRecipes = allRecipes.filter(r => r.recipeId !== recipe.recipeId);
    render();
  });

  actions.append(openBtn, delBtn);
  card.appendChild(actions);
  return card;
}

function createEmpty() {
  const wrap = document.createElement('div');
  wrap.className = 'empty';
  const isTrulyEmpty = allRecipes.length === 0;
  const h2 = document.createElement('h2');
  h2.textContent = isTrulyEmpty ? 'No recipes saved yet' : 'Nothing matches';
  const p = document.createElement('p');
  p.textContent = isTrulyEmpty
    ? 'Visit a recipe page and click "Save" to clip it into a clean reader.'
    : 'Try a different search term.';
  wrap.append(h2, p);
  return wrap;
}

async function renderDetect(detection, savedIds) {
  detectEl.textContent = '';
  if (!detection) return;

  const { recipe, tabUrl } = detection;
  const canonical = recipe.sourceUrl || canonicalizeUrl(tabUrl);
  const recipeId = await sha1Hex(canonical);
  const alreadySaved = savedIds.has(recipeId);

  const wrap = document.createElement('div');
  wrap.className = 'detect-card';

  const img = document.createElement('img');
  const safeImg = safeHttpUrl(recipe.imageUrl);
  if (safeImg) img.src = safeImg;
  img.alt = '';
  img.referrerPolicy = 'no-referrer';
  wrap.appendChild(img);

  const info = document.createElement('div');
  info.className = 'detect-info';
  const name = document.createElement('div');
  name.className = 'detect-name';
  name.textContent = recipe.name || '(untitled recipe)';
  const meta = document.createElement('div');
  meta.className = 'detect-meta';
  const parts = [];
  if (recipe.totalTimeMin > 0) parts.push(recipe.totalTimeMin + ' min');
  if (recipe.ingredients.length > 0) parts.push(recipe.ingredients.length + ' ingredients');
  if (recipe.hostname) parts.push(recipe.hostname.replace(/^www\./, ''));
  meta.textContent = parts.join(' \u00B7 ');
  info.append(name, meta);
  wrap.appendChild(info);

  const btn = document.createElement('button');
  btn.className = 'save-btn' + (alreadySaved ? ' saved' : '');
  btn.type = 'button';
  btn.textContent = alreadySaved ? 'Saved' : 'Save';
  btn.disabled = alreadySaved;
  btn.addEventListener('click', async () => {
    await store.save({ ...recipe, recipeId, savedAt: Date.now() });
    await refresh();
  });
  wrap.appendChild(btn);
  detectEl.appendChild(wrap);
}

async function refresh() {
  const [loaded, detection] = await Promise.all([
    store.loadAll(),
    detectOnActiveTab()
  ]);
  allRecipes = loaded;
  const savedIds = new Set(loaded.map(r => r.recipeId));
  await renderDetect(detection, savedIds);
  render();
}

function render() {
  const filtered = allRecipes.filter(r => matchesSearch(r, currentSearch));
  const suffix = filtered.length !== allRecipes.length ? ` of ${allRecipes.length}` : '';
  statsEl.textContent = `${filtered.length}${suffix} saved`;

  listEl.textContent = '';
  if (filtered.length === 0) {
    listEl.appendChild(createEmpty());
    return;
  }
  const frag = document.createDocumentFragment();
  for (const r of filtered) frag.appendChild(createCard(r));
  listEl.appendChild(frag);
}

searchInput.addEventListener('input', (e) => {
  currentSearch = e.target.value;
  render();
});

exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(allRecipes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `just-recipes-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

clearBtn.addEventListener('click', async () => {
  if (!confirm('Clear all saved recipes? This cannot be undone.')) return;
  await store.clearAll();
  allRecipes = [];
  render();
});

refresh();
