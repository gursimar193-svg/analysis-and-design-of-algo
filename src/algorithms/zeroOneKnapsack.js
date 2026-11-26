/**
 * Dynamic Programming 0/1 Knapsack Solver
 * ---------------------------------------
 * Time Complexity:  O(n * W) where n = item count and W = scaled capacity.
 * Space Complexity: O(n * W) for 2D table + backtracking (with safe memory guard).
 */

function roundTo(value, decimals = 4) {
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Computes a power-of-10 scale factor (1, 10, or 100) if weights/capacity have decimals.
 */
function computeScaleFactor(values) {
  let maxDecimals = 0;
  for (const val of values) {
    if (!Number.isFinite(val) || val === 0) continue;
    if (Math.abs(val - Math.round(val)) < 1e-9) continue;
    if (Math.abs(val * 10 - Math.round(val * 10)) < 1e-9) {
      maxDecimals = Math.max(maxDecimals, 1);
    } else {
      return 100;
    }
  }
  return Math.pow(10, maxDecimals);
}

/**
 * Builds a compact DP matrix preview (max 12 rows x 21 cols) for UI visualization.
 */
function buildDpPreview(dp, n, W, pathSet) {
  const maxRows = Math.min(n + 1, 13);
  const maxCols = Math.min(W + 1, 21);

  const rowIndices = [];
  for (let i = 0; i < maxRows; i++) {
    const mapped = maxRows === n + 1 ? i : Math.round((i * n) / (maxRows - 1));
    if (rowIndices[rowIndices.length - 1] !== mapped) rowIndices.push(mapped);
  }

  const colIndices = [];
  for (let j = 0; j < maxCols; j++) {
    const mapped = maxCols === W + 1 ? j : Math.round((j * W) / (maxCols - 1));
    if (colIndices[colIndices.length - 1] !== mapped) colIndices.push(mapped);
  }

  const cells = rowIndices.map((r) =>
    colIndices.map((c) => ({
      row: r,
      col: c,
      value: roundTo(dp[r][c], 2),
      onOptimalPath: pathSet.has(`${r},${c}`)
    }))
  );

  return {
    sampled: n + 1 > maxRows || W + 1 > maxCols,
    totalRows: n + 1,
    totalCols: W + 1,
    rowIndices,
    colIndices,
    cells
  };
}

/**
 * Solves the 0/1 Knapsack problem using bottom-up Dynamic Programming.
 *
 * @param {Array<{id: string|number, name: string, category?: string, weight: number, profit: number}>} items
 * @param {number} capacity
 * @returns {object} Optimization result with selected whole items, metrics, and DP table preview
 */
function solveZeroOneKnapsack(items, capacity) {
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
    return {
      id: item.id ?? idx + 1,
      name: String(item.name ?? `Product-${idx + 1}`),
      category: String(item.category ?? 'General'),
      weight,
      profit,
      ratio: weight === 0 ? (profit > 0 ? Infinity : 0) : profit / weight
    };
  });

  const scale = computeScaleFactor([maxCapacity, ...normalized.map((i) => i.weight)]);
  const W = Math.floor(maxCapacity * scale + 1e-9);
  const n = normalized.length;

  // Guard against excessive DP memory allocation (max ~2,000,000 cells)
  const MAX_DP_CELLS = 2_000_000;
  if (n * (W + 1) > MAX_DP_CELLS) {
    throw new RangeError(
      `DP table size (${n} x ${W + 1} = ${n * (W + 1)} cells) exceeds memory guard (${MAX_DP_CELLS}). Reduce capacity or use integer weights.`
    );
  }

  // Allocate (n + 1) x (W + 1) table using Float64Array rows for speed and precision
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(W + 1));

  for (let i = 1; i <= n; i++) {
    const item = normalized[i - 1];
    const itemW = Math.round(item.weight * scale);
    const itemP = item.profit;
    const prevRow = dp[i - 1];
    const currRow = dp[i];

    for (let w = 0; w <= W; w++) {
      const excludeVal = prevRow[w];
      if (itemW <= w) {
        const includeVal = prevRow[w - itemW] + itemP;
        currRow[w] = includeVal > excludeVal ? includeVal : excludeVal;
      } else {
        currRow[w] = excludeVal;
      }
    }
  }

  // Backtrack to recover exact selected whole items and optimal path cells
  const selectedFlags = new Array(n).fill(false);
  const pathSet = new Set();
  let remainingW = W;
  pathSet.add(`${n},${remainingW}`);

  for (let i = n; i >= 1; i--) {
    const itemW = Math.round(normalized[i - 1].weight * scale);
    const itemP = normalized[i - 1].profit;

    if (
      itemW <= remainingW &&
      Math.abs(dp[i][remainingW] - (dp[i - 1][remainingW - itemW] + itemP)) < 1e-9 &&
      (dp[i][remainingW] > dp[i - 1][remainingW] + 1e-9 || itemW === 0)
    ) {
      selectedFlags[i - 1] = true;
      remainingW -= itemW;
    }
    pathSet.add(`${i - 1},${remainingW}`);
  }

  let totalWeight = 0;
  let totalProfit = 0;

  const selections = normalized.map((item, idx) => {
    const isSelected = selectedFlags[idx];
    const takenWeight = isSelected ? item.weight : 0;
    const earnedProfit = isSelected ? item.profit : 0;
    totalWeight += takenWeight;
    totalProfit += earnedProfit;

    return {
      id: item.id,
      name: item.name,
      category: item.category,
      weight: item.weight,
      profit: item.profit,
      ratio: Number.isFinite(item.ratio) ? roundTo(item.ratio, 4) : 'Infinity',
      fraction: isSelected ? 1 : 0,
      takenWeight: roundTo(takenWeight, 4),
      earnedProfit: roundTo(earnedProfit, 4),
      decision: isSelected ? 'FULL' : 'SKIPPED'
    };
  });

  const dpTablePreview = buildDpPreview(dp, n, W, pathSet);
  const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
  const utilizationPct = maxCapacity > 0 ? roundTo((totalWeight / maxCapacity) * 100, 2) : 0;

  return {
    algorithm: 'Dynamic Programming (0/1 Knapsack)',
    engine: 'Node.js',
    timeComplexity: 'O(n * W)',
    spaceComplexity: 'O(n * W)',
    capacity: maxCapacity,
    scaledCapacity: W,
    scaleFactor: scale,
    dpStatesComputed: n * (W + 1),
    totalItemsEvaluated: n,
    selectedCount: selections.filter((s) => s.decision === 'FULL').length,
    totalWeight: roundTo(totalWeight, 4),
    totalProfit: roundTo(totalProfit, 4),
    utilizationPct,
    executionTimeMs: roundTo(elapsedMs, 4),
    selections,
    dpTablePreview
  };
}

module.exports = { solveZeroOneKnapsack };
