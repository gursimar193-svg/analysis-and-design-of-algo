package com.inventory.knapsack;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Dynamic Programming 0/1 Knapsack Solver (Java).
 * Time Complexity:  O(n * W)
 * Space Complexity: O(n * W)
 */
public class DynamicProgrammingSolver {

    private static final long MAX_DP_CELLS = 2_000_000L;

    private static double roundTo(double value, int decimals) {
        if (!Double.isFinite(value)) return value;
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    private static int computeScaleFactor(double capacity, List<InventoryItem> items) {
        int maxDecimals = decimalsOf(capacity);
        for (InventoryItem item : items) {
            int dec = decimalsOf(item.getWeight());
            if (dec > maxDecimals) maxDecimals = dec;
        }
        return (int) Math.pow(10, Math.min(maxDecimals, 2));
    }

    private static int decimalsOf(double val) {
        if (!Double.isFinite(val) || val == 0.0) return 0;
        int scale = BigDecimal.valueOf(val).stripTrailingZeros().scale();
        return Math.max(0, scale);
    }

    public static KnapsackResult solve(List<InventoryItem> items, double capacity) {
        long startNs = System.nanoTime();
        double maxCapacity = Math.max(0.0, capacity);

        int n = items.size();
        int scale = computeScaleFactor(maxCapacity, items);
        int W = (int) Math.floor(maxCapacity * scale + 1e-9);

        long totalCells = (long) n * (W + 1);
        if (totalCells > MAX_DP_CELLS) {
            throw new IllegalArgumentException(
                "DP table size (" + n + " x " + (W + 1) + ") exceeds memory guard (" + MAX_DP_CELLS + ")."
            );
        }

        double[][] dp = new double[n + 1][W + 1];

        for (int i = 1; i <= n; i++) {
            InventoryItem item = items.get(i - 1);
            int itemW = (int) Math.round(item.getWeight() * scale);
            double itemP = item.getProfit();

            for (int w = 0; w <= W; w++) {
                double excludeVal = dp[i - 1][w];
                if (itemW <= w) {
                    double includeVal = dp[i - 1][w - itemW] + itemP;
                    dp[i][w] = Math.max(includeVal, excludeVal);
                } else {
                    dp[i][w] = excludeVal;
                }
            }
        }

        boolean[] selectedFlags = new boolean[n];
        Set<String> pathSet = new HashSet<>();
        int remainingW = W;
        pathSet.add(n + "," + remainingW);

        for (int i = n; i >= 1; i--) {
            InventoryItem item = items.get(i - 1);
            int itemW = (int) Math.round(item.getWeight() * scale);
            double itemP = item.getProfit();

            if (itemW <= remainingW
                    && Math.abs(dp[i][remainingW] - (dp[i - 1][remainingW - itemW] + itemP)) < 1e-9
                    && (dp[i][remainingW] > dp[i - 1][remainingW] + 1e-9 || itemW == 0)) {
                selectedFlags[i - 1] = true;
                remainingW -= itemW;
            }
            pathSet.add((i - 1) + "," + remainingW);
        }

        double totalWeight = 0.0;
        double totalProfit = 0.0;
        int selectedCount = 0;
        List<KnapsackResult.SelectionEntry> selections = new ArrayList<>(n);

        for (int i = 0; i < n; i++) {
            InventoryItem item = items.get(i);
            boolean isSelected = selectedFlags[i];
            double takenWeight = isSelected ? item.getWeight() : 0.0;
            double earnedProfit = isSelected ? item.getProfit() : 0.0;
            if (isSelected) selectedCount++;
            totalWeight += takenWeight;
            totalProfit += earnedProfit;

            selections.add(new KnapsackResult.SelectionEntry(
                item.getId(),
                item.getName(),
                item.getCategory(),
                item.getWeight(),
                item.getProfit(),
                roundTo(item.getRatio(), 4),
                isSelected ? 1.0 : 0.0,
                roundTo(takenWeight, 4),
                roundTo(earnedProfit, 4),
                isSelected ? "FULL" : "SKIPPED"
            ));
        }

        KnapsackResult res = new KnapsackResult();
        buildDpPreview(res, dp, n, W, pathSet);

        double elapsedMs = (System.nanoTime() - startNs) / 1_000_000.0;
        double utilizationPct = maxCapacity > 0.0 ? roundTo((totalWeight / maxCapacity) * 100.0, 2) : 0.0;

        res.algorithm = "Dynamic Programming (0/1 Knapsack)";
        res.engine = "Java";
        res.timeComplexity = "O(n * W)";
        res.spaceComplexity = "O(n * W)";
        res.capacity = maxCapacity;
        res.scaledCapacity = W;
        res.scaleFactor = scale;
        res.dpStatesComputed = totalCells;
        res.totalItemsEvaluated = n;
        res.selectedCount = selectedCount;
        res.totalWeight = roundTo(totalWeight, 4);
        res.totalProfit = roundTo(totalProfit, 4);
        res.utilizationPct = utilizationPct;
        res.executionTimeMs = roundTo(elapsedMs, 4);
        res.selections = selections;
        return res;
    }

    private static void buildDpPreview(KnapsackResult res, double[][] dp, int n, int W, Set<String> pathSet) {
        int maxRows = Math.min(n + 1, 13);
        int maxCols = Math.min(W + 1, 21);

        List<Integer> rowIdx = new ArrayList<>();
        for (int i = 0; i < maxRows; i++) {
            int mapped = (maxRows == n + 1) ? i : (int) Math.round((double) i * n / (maxRows - 1));
            if (rowIdx.isEmpty() || rowIdx.get(rowIdx.size() - 1) != mapped) rowIdx.add(mapped);
        }

        List<Integer> colIdx = new ArrayList<>();
        for (int j = 0; j < maxCols; j++) {
            int mapped = (maxCols == W + 1) ? j : (int) Math.round((double) j * W / (maxCols - 1));
            if (colIdx.isEmpty() || colIdx.get(colIdx.size() - 1) != mapped) colIdx.add(mapped);
        }

        res.dpSampled = (n + 1 > maxRows) || (W + 1 > maxCols);
        res.dpTotalRows = n + 1;
        res.dpTotalCols = W + 1;
        res.dpRowIndices = rowIdx.stream().mapToInt(Integer::intValue).toArray();
        res.dpColIndices = colIdx.stream().mapToInt(Integer::intValue).toArray();
        res.dpPreviewValues = new double[rowIdx.size()][colIdx.size()];
        res.dpPreviewOnPath = new boolean[rowIdx.size()][colIdx.size()];

        for (int r = 0; r < rowIdx.size(); r++) {
            int ri = rowIdx.get(r);
            for (int c = 0; c < colIdx.size(); c++) {
                int ci = colIdx.get(c);
                res.dpPreviewValues[r][c] = roundTo(dp[ri][ci], 2);
                res.dpPreviewOnPath[r][c] = pathSet.contains(ri + "," + ci);
            }
        }
    }
}
