/**
 * Greedy Fractional Knapsack Solver
 * ---------------------------------
 * Time Complexity:  O(n log n) due to sorting by profit-to-weight ratio.
 * Space Complexity: O(n) for storing sorted items and decision trace.
 */

function roundTo(value, decimals = 4) {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Solves the Fractional Knapsack problem using a Greedy ratio-first strategy.
 * Also computes a naive Greedy 0/1 heuristic (no splitting) for analytical contrast.
 *
 * @param {Array<{id: string|number, name: string, category?: string, weight: number, profit: number}>} items
 * @param {number} capacity
 * @returns {object} Optimization result with selected items, metrics, and step trace
 */
function solveFractionalKnapsack(items, capacity) {
  const startNs = process.hrtime.bigint();

  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }
  const maxCapacity = Math.max(0, Number(capacity) || 0);

  const normalized = items.map((item, idx) => {
    const weight = Number(item.weight);
    const profit = Number(item.profit);
    if (!Number.isFinite(weight) || weight < 0) {
      throw new RangeError(`Invalid weight for item "${item.name ?? idx}": ${item.weight}`);
    }
    if (!Number.isFinite(profit) || profit < 0) {
      throw new RangeError(`Invalid profit for item "${item.name ?? idx}": ${item.profit}`);
    }
    const ratio = weight === 0 ? (profit > 0 ? Infinity : 0) : profit / weight;
    return {
      id: item.id ?? idx + 1,
      name: String(item.name ?? `Product-${idx + 1}`),
      category: String(item.category ?? 'General'),
      weight,
      profit,
      ratio,
      originalIndex: idx
    };
  });

  // Sort descending by profit-to-weight ratio; tie-break by higher profit, then smaller weight, then originalIndex
  const sorted = [...normalized].sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    if (b.profit !== a.profit) return b.profit - a.profit;
    if (a.weight !== b.weight) return a.weight - b.weight;
    return a.originalIndex - b.originalIndex;
  });

  let remaining = maxCapacity;
  let totalWeight = 0;
  let totalProfit = 0;

  // Also track naive Greedy 0/1 (whole units only in ratio order) to illustrate why DP is needed for 0/1
  let greedy01Remaining = maxCapacity;
  let greedy01Profit = 0;
  let greedy01Weight = 0;

  const selections = [];
  const trace = [];

  for (let step = 0; step < sorted.length; step++) {
    const item = sorted[step];

    // Naive 0/1 greedy check
    if (item.weight <= greedy01Remaining) {
      greedy01Remaining -= item.weight;
      greedy01Weight += item.weight;
      greedy01Profit += item.profit;
    }

    let fraction = 0;
    let takenWeight = 0;
    let earnedProfit = 0;
    let decision = 'SKIPPED';

    if (item.weight === 0) {
      // Zero-weight items take no storage capacity
      fraction = 1;
      takenWeight = 0;
      earnedProfit = item.profit;
      decision = 'FULL';
      totalProfit += earnedProfit;
    } else if (remaining > 0) {
      if (item.weight <= remaining) {
        fraction = 1;
        takenWeight = item.weight;
        earnedProfit = item.profit;
        remaining -= item.weight;
        decision = 'FULL';
      } else {
        fraction = remaining / item.weight;
        takenWeight = remaining;
        earnedProfit = item.profit * fraction;
        remaining = 0;
        decision = 'PARTIAL';
      }
      totalWeight += takenWeight;
      totalProfit += earnedProfit;
    }

    selections.push({
      id: item.id,
      name: item.name,
      category: item.category,
      weight: item.weight,
      profit: item.profit,
      ratio: Number.isFinite(item.ratio) ? roundTo(item.ratio, 4) : 'Infinity',
      fraction: roundTo(fraction, 6),
      takenWeight: roundTo(takenWeight, 4),
      earnedProfit: roundTo(earnedProfit, 4),
      decision
    });

    trace.push({
      step: step + 1,
      itemId: item.id,
      itemName: item.name,
      ratio: Number.isFinite(item.ratio) ? roundTo(item.ratio, 4) : 'Infinity',
      decision,
      fraction: roundTo(fraction, 4),
      remainingCapacityAfter: roundTo(remaining, 4)
    });
  }

  const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
  const utilizationPct = maxCapacity > 0 ? roundTo((totalWeight / maxCapacity) * 100, 2) : 0;

  return {
    algorithm: 'Greedy (Fractional Knapsack)',
    engine: 'Node.js',
    timeComplexity: 'O(n log n)',
    spaceComplexity: 'O(n)',
    capacity: maxCapacity,
    totalItemsEvaluated: normalized.length,
    selectedCount: selections.filter((s) => s.fraction > 0).length,
    fullCount: selections.filter((s) => s.decision === 'FULL').length,
    partialCount: selections.filter((s) => s.decision === 'PARTIAL').length,
    totalWeight: roundTo(totalWeight, 4),
    totalProfit: roundTo(totalProfit, 4),
    utilizationPct,
    executionTimeMs: roundTo(elapsedMs, 4),
    greedyZeroOneHeuristic: {
      totalProfit: roundTo(greedy01Profit, 4),
      totalWeight: roundTo(greedy01Weight, 4)
    },
    selections,
    trace
  };
}

module.exports = { solveFractionalKnapsack };
