const { solveFractionalKnapsack } = require('./fractionalKnapsack');
const { solveZeroOneKnapsack } = require('./zeroOneKnapsack');

/**
 * Deterministic pseudo-random generator (Mulberry32) for reproducible benchmarks.
 */
function createRng(seed = 42) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSyntheticInventory(count, seed = 2026) {
  const rng = createRng(seed + count);
  const categories = ['Electronics', 'Apparel', 'Pharma', 'Hardware', 'FMCG'];
  const items = [];
  for (let i = 0; i < count; i++) {
    const weight = Math.floor(rng() * 35) + 5; // 5..39
    const profit = Math.floor(rng() * 450) + 50; // 50..499
    items.push({
      id: `SKU-${i + 1}`,
      name: `Warehouse Item ${i + 1}`,
      category: categories[i % categories.length],
      weight,
      profit
    });
  }
  return items;
}

/**
 * Runs empirical scaling tests across varying item counts and capacities.
 */
function runScalingBenchmark(options = {}) {
  const itemCounts = options.itemCounts || [10, 25, 50, 100, 200, 350, 500];
  const capacityFactor = options.capacityFactor || 12; // capacity = count * capacityFactor (capped)
  const iterations = Math.max(1, Math.min(10, Number(options.iterations) || 3));

  const results = [];

  for (const n of itemCounts) {
    const items = generateSyntheticInventory(n);
    const capacity = Math.min(n * capacityFactor, 2500);

    let greedySumMs = 0;
    let dpSumMs = 0;
    let greedyProfit = 0;
    let dpProfit = 0;
    let greedy01Profit = 0;

    for (let it = 0; it < iterations; it++) {
      const g = solveFractionalKnapsack(items, capacity);
      const d = solveZeroOneKnapsack(items, capacity);
      greedySumMs += g.executionTimeMs;
      dpSumMs += d.executionTimeMs;
      greedyProfit = g.totalProfit;
      dpProfit = d.totalProfit;
      greedy01Profit = g.greedyZeroOneHeuristic.totalProfit;
    }

    const avgGreedyMs = Number((greedySumMs / iterations).toFixed(4));
    const avgDpMs = Number((dpSumMs / iterations).toFixed(4));

    results.push({
      itemCount: n,
      capacity,
      greedyTimeMs: avgGreedyMs,
      dpTimeMs: avgDpMs,
      speedupRatio: avgGreedyMs > 0 ? Number((avgDpMs / avgGreedyMs).toFixed(2)) : 0,
      greedyProfit,
      dpProfit,
      greedy01HeuristicProfit: greedy01Profit,
      profitGap: Number((greedyProfit - dpProfit).toFixed(2))
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    iterationsPerPoint: iterations,
    points: results
  };
}

if (require.main === module) {
  const report = runScalingBenchmark();
  console.log('\n=== Knapsack Scaling Benchmark (Greedy Fractional vs DP 0/1) ===');
  console.table(report.points);
}

module.exports = { runScalingBenchmark, generateSyntheticInventory };
