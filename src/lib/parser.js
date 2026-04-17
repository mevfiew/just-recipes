import { parseIso8601Duration } from './iso8601-duration.js';

const TRACKING_PARAM_PATTERNS = [
  /^utm_/i, /^gclid$/i, /^fbclid$/i, /^ref$/i, /^mc_/i, /^mkt_tok$/i, /^msclkid$/i, /^yclid$/i
];

const DESCRIPTION_MAX = 300;

export function canonicalizeUrl(urlString) {
  try {
    const u = new URL(urlString);
    const kept = [];
    for (const [key, value] of u.searchParams.entries()) {
      if (TRACKING_PARAM_PATTERNS.some(rx => rx.test(key))) continue;
      kept.push([key, value]);
    }
    u.search = '';
    for (const [k, v] of kept) u.searchParams.append(k, v);
    u.hash = '';
    return u.toString().replace(/\?$/, '');
  } catch {
    return urlString;
  }
}

export function extractJsonLdBlocks(html) {
  const rx = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out = [];
  for (const m of html.matchAll(rx)) out.push(m[1].trim());
  return out;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) : str;
}

function getImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) return getImageUrl(image[0]);
  if (typeof image === 'object') return image.url || '';
  return '';
}

function getAuthor(author) {
  if (!author) return '';
  if (typeof author === 'string') return author;
  if (Array.isArray(author)) return author.map(getAuthor).filter(Boolean).join(', ');
  return author.name || '';
}

function normalizeStringArray(value) {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .map(v => (typeof v === 'string' ? v : ''))
    .map(v => v.trim())
    .filter(v => v.length > 0);
}

export function normalizeInstructions(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') return [raw.trim()].filter(Boolean);
  if (!Array.isArray(raw)) return [];

  const out = [];
  for (const step of raw) {
    if (typeof step === 'string') {
      const s = step.trim();
      if (s) out.push(s);
      continue;
    }
    if (!step || typeof step !== 'object') continue;
    const type = step['@type'];
    if (type === 'HowToStep') {
      const text = String(step.text || step.name || '').trim();
      if (text) out.push(text);
    } else if (type === 'HowToSection') {
      const sub = normalizeInstructions(step.itemListElement);
      out.push(...sub);
    } else if (step.text || step.name) {
      const text = String(step.text || step.name || '').trim();
      if (text) out.push(text);
    }
  }
  return out;
}

function findRecipeInLdObject(ldObj) {
  if (!ldObj || typeof ldObj !== 'object') return null;
  if (Array.isArray(ldObj['@graph'])) {
    for (const node of ldObj['@graph']) {
      const found = findRecipeInLdObject(node);
      if (found) return found;
    }
    return null;
  }
  if (Array.isArray(ldObj)) {
    for (const node of ldObj) {
      const found = findRecipeInLdObject(node);
      if (found) return found;
    }
    return null;
  }
  const t = ldObj['@type'];
  const isRecipe = t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'));
  return isRecipe ? ldObj : null;
}

export function normalizeRecipe(node, sourceUrl) {
  if (!node) return null;
  const ingredients = normalizeStringArray(node.recipeIngredient || node.ingredients);
  const instructions = normalizeInstructions(node.recipeInstructions);
  if (ingredients.length === 0 && instructions.length === 0) return null;

  const totalTimeISO = String(node.totalTime || '');
  const prepTimeISO = String(node.prepTime || '');
  const cookTimeISO = String(node.cookTime || '');

  let hostname = '';
  try { hostname = new URL(sourceUrl).hostname; } catch {}

  const keywordsRaw = node.keywords;
  const keywords = typeof keywordsRaw === 'string'
    ? keywordsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : (Array.isArray(keywordsRaw) ? keywordsRaw.filter(s => typeof s === 'string') : []);

  return {
    sourceUrl: canonicalizeUrl(sourceUrl),
    hostname,
    name: String(node.name || '').trim(),
    imageUrl: getImageUrl(node.image),
    author: getAuthor(node.author),
    description: truncate(String(node.description || '').trim(), DESCRIPTION_MAX),
    ingredients,
    instructions,
    totalTimeISO,
    totalTimeMin: parseIso8601Duration(totalTimeISO),
    prepTimeMin: parseIso8601Duration(prepTimeISO),
    cookTimeMin: parseIso8601Duration(cookTimeISO),
    yield: String(node.recipeYield || '').trim(),
    cuisine: typeof node.recipeCuisine === 'string' ? node.recipeCuisine : (Array.isArray(node.recipeCuisine) ? node.recipeCuisine.join(', ') : ''),
    category: typeof node.recipeCategory === 'string' ? node.recipeCategory : (Array.isArray(node.recipeCategory) ? node.recipeCategory.join(', ') : ''),
    keywords
  };
}

export function extractRecipeFromHtml(html, sourceUrl) {
  for (const block of extractJsonLdBlocks(html)) {
    let ld;
    try { ld = JSON.parse(block); } catch { continue; }
    const recipeNode = findRecipeInLdObject(ld);
    if (!recipeNode) continue;
    const normalized = normalizeRecipe(recipeNode, sourceUrl);
    if (normalized) return normalized;
  }
  return null;
}
