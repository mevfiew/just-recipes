import * as store from './lib/storage.js';

const contentEl = document.getElementById('content');
const navSourceEl = document.getElementById('nav-source');

function safeHttpUrl(url) {
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : '';
  } catch { return ''; }
}

function badge(text, accent = false) {
  const span = document.createElement('span');
  span.className = 'meta-badge' + (accent ? ' accent' : '');
  span.textContent = text;
  return span;
}

function renderEmpty(reason) {
  contentEl.textContent = '';
  const wrap = document.createElement('div');
  wrap.className = 'empty';
  const h2 = document.createElement('h2');
  h2.textContent = 'Recipe not found';
  h2.style.cssText = 'border: none; font-size: 1em; margin: 0 0 8px;';
  const p = document.createElement('p');
  p.textContent = reason || 'This recipe is not in your library. Open the Just Recipes popup to see your saved recipes.';
  wrap.append(h2, p);
  contentEl.appendChild(wrap);
}

function renderRecipe(recipe) {
  document.title = recipe.name + ' · Just Recipes';

  // Nav source link
  const safeSource = safeHttpUrl(recipe.sourceUrl);
  if (safeSource && recipe.hostname) {
    navSourceEl.textContent = '';
    const a = document.createElement('a');
    a.href = safeSource;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Original on ' + recipe.hostname.replace(/^www\./, '');
    navSourceEl.appendChild(a);
  }

  contentEl.textContent = '';

  const h1 = document.createElement('h1');
  h1.textContent = recipe.name;
  contentEl.appendChild(h1);

  if (recipe.author || recipe.hostname) {
    const line = document.createElement('div');
    line.className = 'source-line';
    const parts = [];
    if (recipe.author) parts.push('by ' + recipe.author);
    if (recipe.hostname) {
      const a = document.createElement('a');
      a.href = safeSource || '#';
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = recipe.hostname.replace(/^www\./, '');
      line.textContent = parts.join(' · ');
      if (parts.length > 0) line.appendChild(document.createTextNode(' · '));
      line.appendChild(a);
    } else {
      line.textContent = parts.join(' · ');
    }
    contentEl.appendChild(line);
  }

  const safeImg = safeHttpUrl(recipe.imageUrl);
  if (safeImg) {
    const img = document.createElement('img');
    img.className = 'hero';
    img.src = safeImg;
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    contentEl.appendChild(img);
  }

  const meta = document.createElement('div');
  meta.className = 'meta';
  if (recipe.totalTimeMin > 0) meta.appendChild(badge(`Total · ${recipe.totalTimeMin} min`, true));
  if (recipe.prepTimeMin > 0) meta.appendChild(badge(`Prep · ${recipe.prepTimeMin} min`));
  if (recipe.cookTimeMin > 0) meta.appendChild(badge(`Cook · ${recipe.cookTimeMin} min`));
  if (recipe.yield) meta.appendChild(badge(`Yield · ${recipe.yield}`));
  if (recipe.cuisine) meta.appendChild(badge(recipe.cuisine));
  if (recipe.category) meta.appendChild(badge(recipe.category));
  if (meta.children.length > 0) contentEl.appendChild(meta);

  if (recipe.description) {
    const desc = document.createElement('div');
    desc.className = 'description';
    desc.textContent = recipe.description;
    contentEl.appendChild(desc);
  }

  if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
    const h2 = document.createElement('h2');
    h2.textContent = 'Ingredients';
    contentEl.appendChild(h2);

    const ul = document.createElement('ul');
    ul.className = 'ingredients';
    for (const ing of recipe.ingredients) {
      const li = document.createElement('li');
      li.textContent = ing;
      ul.appendChild(li);
    }
    contentEl.appendChild(ul);
  }

  if (Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
    const h2 = document.createElement('h2');
    h2.textContent = 'Instructions';
    contentEl.appendChild(h2);

    const ol = document.createElement('ol');
    ol.className = 'instructions';
    for (const step of recipe.instructions) {
      const li = document.createElement('li');
      li.textContent = step;
      ol.appendChild(li);
    }
    contentEl.appendChild(ol);
  }
}

async function main() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) {
    renderEmpty('No recipe id provided.');
    return;
  }
  const recipe = await store.loadOne(id);
  if (!recipe) {
    renderEmpty();
    return;
  }
  renderRecipe(recipe);
}

main();
