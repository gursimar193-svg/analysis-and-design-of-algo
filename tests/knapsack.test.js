const test = require('node:test');
const assert = require('node:assert/strict');
const { solveFractionalKnapsack } = require('../src/algorithms/fractionalKnapsack');
const { solveZeroOneKnapsack } = require('../src/algorithms/zeroOneKnapsack');
const { createServer } = require('../src/server');
const { PRESETS } = require('../src/data/presets');

test('Greedy Fractional vs DP 0/1 on Classic Greedy Trap', () => {
  const preset = PRESETS.find((p) => p.id === 'greedy-trap');
  const fractional = solveFractionalKnapsack(preset.items, preset.defaultCapacity);
  const zeroOne = solveZeroOneKnapsack(preset.items, preset.defaultCapacity);

  // Fractional takes GT-04 (41kg, 250) + 9/25 of GT-01 (9kg, 52.2) = 302.2
  assert.equal(fractional.totalProfit, 302.2);
  assert.equal(fractional.totalWeight, 50);
  assert.equal(fractional.partialCount, 1);

  // Naive Greedy 0/1 gets trapped at GT-04 = 250
  assert.equal(fractional.greedyZeroOneHeuristic.totalProfit, 250);

  // DP 0/1 finds GT-01 + GT-02 = 25 + 25 = 50kg, Profit = 290
  assert.equal(zeroOne.totalProfit, 290);
  assert.equal(zeroOne.totalWeight, 50);
  assert.equal(zeroOne.selectedCount, 2);
});

test('Zero capacity and empty inventory edge cases', () => {
  const sample = [{ id: 'A', name: 'Item A', weight: 10, profit: 100 }];

  const gZero = solveFractionalKnapsack(sample, 0);
  const dZero = solveZeroOneKnapsack(sample, 0);
  assert.equal(gZero.totalProfit, 0);
  assert.equal(dZero.totalProfit, 0);

  const gEmpty = solveFractionalKnapsack([], 100);
  const dEmpty = solveZeroOneKnapsack([], 100);
  assert.equal(gEmpty.totalProfit, 0);
  assert.equal(dEmpty.totalProfit, 0);
});

test('Decimal weights and capacity scaling in DP 0/1', () => {
  const items = [
    { id: 'D1', name: 'Half-Kg Sensor', weight: 1.5, profit: 60 },
    { id: 'D2', name: 'Module B', weight: 2.5, profit: 90 },
    { id: 'D3', name: 'Module C', weight: 3.0, profit: 100 }
  ];
  const dp = solveZeroOneKnapsack(items, 4.0);
  assert.equal(dp.scaleFactor, 10);
  assert.equal(dp.totalWeight, 4);
  assert.equal(dp.totalProfit, 150);
});

test('Zero-weight positive-profit items are always included', () => {
  const items = [
    { id: 'Z1', name: 'Digital License', weight: 0, profit: 200 },
    { id: 'W1', name: 'Hardware Box', weight: 10, profit: 100 }
  ];
  const g = solveFractionalKnapsack(items, 5);
  const d = solveZeroOneKnapsack(items, 5);
  assert.equal(g.totalProfit, 250);
  assert.equal(d.totalProfit, 200);
});

test('Rejects negative weight or profit', () => {
  assert.throws(() => solveFractionalKnapsack([{ name: 'Bad', weight: -5, profit: 10 }], 50), RangeError);
  assert.throws(() => solveZeroOneKnapsack([{ name: 'Bad', weight: 5, profit: -10 }], 50), RangeError);
});

test('HTTP API endpoints work end-to-end', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, 'ok');
    if (health.java && health.java.available) {
      assert.ok(health.java.version && health.java.version.length > 0);
    }

    const presetsRes = await fetch(`${baseUrl}/api/presets`);
    assert.equal(presetsRes.status, 200);
    const { presets } = await presetsRes.json();
    assert.ok(presets.length >= 4);

    const optRes = await fetch(`${baseUrl}/api/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        capacity: presets[0].defaultCapacity,
        items: presets[0].items,
        engine: 'node'
      })
    });
    assert.equal(optRes.status, 200);
    const opt = await optRes.json();
    assert.ok(opt.fractional.totalProfit >= opt.zeroOne.totalProfit);
    assert.ok(opt.zeroOne.dpTablePreview.cells.length > 0);

    if (health.java && health.java.available) {
      const javaOptRes = await fetch(`${baseUrl}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capacity: presets[0].defaultCapacity,
          items: presets[0].items,
          engine: 'java'
        })
      });
      assert.equal(javaOptRes.status, 200);
      const javaOpt = await javaOptRes.json();
      assert.equal(javaOpt.engine, 'Java');
      assert.equal(javaOpt.fractional.totalProfit, opt.fractional.totalProfit);
      assert.equal(javaOpt.zeroOne.totalProfit, opt.zeroOne.totalProfit);
    }

    const benchRes = await fetch(`${baseUrl}/api/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemCounts: [10, 25], iterations: 1 })
    });
    assert.equal(benchRes.status, 200);
    const bench = await benchRes.json();
    assert.equal(bench.points.length, 2);

    const htmlRes = await fetch(`${baseUrl}/`);
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.ok(html.includes('Intelligent Inventory Management'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
