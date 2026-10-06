import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as indicators from '../services/indicators';

const close = (actual: number, expected: number, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);

test('sma and std use the latest window and report NaN without enough data', () => {
  assert.equal(indicators.sma([1, 2, 3, 4, 5], 3), 4);
  assert.ok(isNaN(indicators.sma([1, 2], 3)));
  close(indicators.std([2, 4, 4, 4, 5, 5, 7, 9], 8), 2);
});

test('ema of a constant series is the constant', () => {
  assert.deepEqual(indicators.ema([5, 5, 5, 5], 3), [5, 5, 5, 5]);
});

test('returns are one element shorter than the prices', () => {
  const result = indicators.returns([100, 110, 99]);
  assert.equal(result.length, 2);
  close(result[0], 0.1);
  close(result[1], -0.1);
});

test('rsi is 100 for a rising series, 0 for a falling one and 50 when flat', () => {
  const rising = Array.from({ length: 30 }, (_, i) => 100 + i);
  const falling = Array.from({ length: 30 }, (_, i) => 100 - i);
  assert.equal(indicators.rsi(rising, 14), 100);
  assert.equal(indicators.rsi(falling, 14), 0);
  assert.equal(indicators.rsi(new Array(30).fill(100), 14), 50);
  assert.ok(isNaN(indicators.rsi([1, 2, 3], 14)));
});

test('adx is high for a steady trend and needs 2 * period + 1 bars', () => {
  const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
  const highs = closes.map(c => c + 1);
  const lows = closes.map(c => c - 1);
  assert.ok(indicators.adx(highs, lows, closes, 14) > 90);
  assert.ok(isNaN(indicators.adx(highs.slice(0, 20), lows.slice(0, 20), closes.slice(0, 20), 14)));
});

test('atr is the average true range of the latest bars', () => {
  const closes = [10, 10, 10, 10];
  close(indicators.atr([11, 11, 11, 13], [9, 9, 9, 9], closes, 2), 3);
});

test('hurst exponent separates a random walk from a mean reverting series', () => {
  // Deterministic pseudo random steps
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296 - 0.5;
  };
  const walk: number[] = [100];
  for (let i = 1; i < 2000; i++) {
    walk.push(walk[i - 1] + random());
  }
  const reverting = Array.from({ length: 200 }, (_, i) => 100 + (i % 2 === 0 ? 1 : -1));

  const walkHurst = indicators.hurstExponent(walk);
  assert.ok(walkHurst > 0.4 && walkHurst < 0.6, `random walk hurst was ${walkHurst}`);
  assert.ok(indicators.hurstExponent(reverting) < 0.2);
  assert.ok(isNaN(indicators.hurstExponent([1, 2, 3])));
});

test('max drawdown is the largest peak to trough decline', () => {
  close(indicators.maxDrawdown([100, 120, 90, 130, 117]), 0.25);
  assert.equal(indicators.maxDrawdown([1, 2, 3]), 0);
});

test('skewness and kurtosis of a symmetric two point distribution', () => {
  const data = [1, -1, 1, -1];
  close(indicators.skewness(data, 4), 0);
  close(indicators.kurtosis(data, 4), 1);
});
