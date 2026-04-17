import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import {
  extractRecipeFromHtml,
  normalizeInstructions,
  normalizeRecipe,
  canonicalizeUrl
} from '../src/lib/parser.js';

async function loadFixture(name) {
  return readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}

test('parses BBC Good Food recipe', async () => {
  const html = await loadFixture('bbc-good-food.html');
  const r = extractRecipeFromHtml(html, 'https://www.bbcgoodfood.com/recipes/slow-cooker-bean-chilli');
  assert.ok(r, 'expected a recipe');
  assert.ok(r.name.length > 0);
  assert.ok(r.ingredients.length > 0, `ingredients empty, got ${r.ingredients.length}`);
  assert.ok(r.instructions.length > 0, `instructions empty, got ${r.instructions.length}`);
  assert.ok(r.imageUrl.startsWith('http'));
  assert.strictEqual(r.hostname, 'www.bbcgoodfood.com');
});

test('parses AllRecipes recipe', async () => {
  const html = await loadFixture('allrecipes.html');
  const r = extractRecipeFromHtml(html, 'https://www.allrecipes.com/recipe/10813/best-chocolate-chip-cookies/');
  assert.ok(r);
  assert.ok(r.name.length > 0);
  assert.ok(r.ingredients.length > 0);
  assert.ok(r.instructions.length > 0);
  assert.ok(r.totalTimeMin > 0, `expected totalTimeMin > 0, got ${r.totalTimeMin}`);
});

test('parses synthetic HowToSection nested recipe', async () => {
  const html = await loadFixture('synthetic-howto-steps.html');
  const r = extractRecipeFromHtml(html, 'https://example.com/test-cake');
  assert.ok(r);
  assert.strictEqual(r.name, 'Layered Test Cake');
  assert.strictEqual(r.ingredients.length, 3);
  assert.deepStrictEqual(r.instructions, [
    'Preheat oven to 180C.',
    'Mix flour and sugar in a bowl.',
    'Melt chocolate over a double boiler.',
    'Pour over cooled cake.'
  ]);
  assert.strictEqual(r.totalTimeMin, 90);
  assert.strictEqual(r.prepTimeMin, 20);
  assert.strictEqual(r.cookTimeMin, 60);
  assert.strictEqual(r.yield, '8 servings');
  assert.strictEqual(r.category, 'Dessert');
  assert.strictEqual(r.cuisine, 'Test');
  assert.deepStrictEqual(r.keywords, ['cake', 'test', 'chocolate']);
  assert.strictEqual(r.author, 'Test Chef');
});

test('normalizeInstructions handles string input', () => {
  assert.deepStrictEqual(normalizeInstructions('Mix everything.'), ['Mix everything.']);
});

test('normalizeInstructions handles string array', () => {
  assert.deepStrictEqual(
    normalizeInstructions(['Step 1', 'Step 2']),
    ['Step 1', 'Step 2']
  );
});

test('normalizeInstructions handles HowToStep array', () => {
  const input = [
    { '@type': 'HowToStep', text: 'Step A' },
    { '@type': 'HowToStep', text: 'Step B' }
  ];
  assert.deepStrictEqual(normalizeInstructions(input), ['Step A', 'Step B']);
});

test('normalizeInstructions flattens HowToSection nesting', () => {
  const input = [
    {
      '@type': 'HowToSection',
      itemListElement: [
        { '@type': 'HowToStep', text: 'A' },
        { '@type': 'HowToStep', text: 'B' }
      ]
    },
    {
      '@type': 'HowToSection',
      itemListElement: [
        { '@type': 'HowToStep', text: 'C' }
      ]
    }
  ];
  assert.deepStrictEqual(normalizeInstructions(input), ['A', 'B', 'C']);
});

test('canonicalizeUrl strips utm params', () => {
  assert.strictEqual(
    canonicalizeUrl('https://ex.com/r/123?utm_source=x&ref=y'),
    'https://ex.com/r/123'
  );
});

test('returns null for pages with no Recipe JSON-LD', () => {
  const html = '<html><body>nothing</body></html>';
  assert.strictEqual(extractRecipeFromHtml(html, 'https://ex.com/'), null);
});

test('normalizeRecipe returns null when both ingredients and instructions are empty', () => {
  const node = { '@type': 'Recipe', name: 'Empty' };
  assert.strictEqual(normalizeRecipe(node, 'https://ex.com/'), null);
});
