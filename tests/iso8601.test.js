import { test } from 'node:test';
import assert from 'node:assert';
import { parseIso8601Duration } from '../src/lib/iso8601-duration.js';

test('PT45M -> 45', () => assert.strictEqual(parseIso8601Duration('PT45M'), 45));
test('PT1H -> 60', () => assert.strictEqual(parseIso8601Duration('PT1H'), 60));
test('PT1H30M -> 90', () => assert.strictEqual(parseIso8601Duration('PT1H30M'), 90));
test('PT2H15M -> 135', () => assert.strictEqual(parseIso8601Duration('PT2H15M'), 135));
test('P1D -> 1440', () => assert.strictEqual(parseIso8601Duration('P1D'), 1440));
test('P0D -> 0', () => assert.strictEqual(parseIso8601Duration('P0D'), 0));
test('PT30S -> 0 (seconds ignored, rounded to 0 minutes)', () => assert.strictEqual(parseIso8601Duration('PT30S'), 0));
test('PT1H30M45S -> 90 (seconds ignored)', () => assert.strictEqual(parseIso8601Duration('PT1H30M45S'), 90));
test('empty -> 0', () => assert.strictEqual(parseIso8601Duration(''), 0));
test('null -> 0', () => assert.strictEqual(parseIso8601Duration(null), 0));
test('garbage -> 0', () => assert.strictEqual(parseIso8601Duration('90 minutes'), 0));
test('number input -> 0 (only strings)', () => assert.strictEqual(parseIso8601Duration(90), 0));
