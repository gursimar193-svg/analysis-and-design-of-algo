package com.inventory.knapsack;

import java.util.List;

/**
 * Structured optimization result returned by Greedy and DP Knapsack solvers.
 */
public class KnapsackResult {
    public static class SelectionEntry {
        public final String id;
        public final String name;
        public final String category;
        public final double weight;
        public final double profit;
        public final double ratio;
        public final double fraction;
        public final double takenWeight;
        public final double earnedProfit;
        public final String decision;

        public SelectionEntry(
                String id, String name, String category,
                double weight, double profit, double ratio,
                double fraction, double takenWeight, double earnedProfit, String decision) {
            this.id = id;
            this.name = name;
            this.category = category;
            this.weight = weight;
            this.profit = profit;
            this.ratio = ratio;
            this.fraction = fraction;
            this.takenWeight = takenWeight;
            this.earnedProfit = earnedProfit;
            this.decision = decision;
        }
    }

    public static class TraceStep {
        public final int step;
        public final String itemId;
        public final String itemName;
        public final double ratio;
        public final String decision;
        public final double fraction;
        public final double remainingCapacityAfter;

        public TraceStep(int step, String itemId, String itemName, double ratio,
                         String decision, double fraction, double remainingCapacityAfter) {
            this.step = step;
            this.itemId = itemId;
            this.itemName = itemName;
            this.ratio = ratio;
            this.decision = decision;
            this.fraction = fraction;
            this.remainingCapacityAfter = remainingCapacityAfter;
        }
    }

    public String algorithm;
    public String engine = "Java";
    public String timeComplexity;
    public String spaceComplexity;
    public double capacity;
    public int totalItemsEvaluated;
    public int selectedCount;
    public int fullCount;
    public int partialCount;
    public double totalWeight;
    public double totalProfit;
    public double utilizationPct;
    public double executionTimeMs;
    public double greedy01HeuristicProfit;
    public double greedy01HeuristicWeight;
    public int scaledCapacity;
    public int scaleFactor;
    public long dpStatesComputed;
    public List<SelectionEntry> selections;
    public List<TraceStep> trace;
    public int[][] dpPreviewRows;
    public int[] dpRowIndices;
    public int[] dpColIndices;
    public double[][] dpPreviewValues;
    public boolean[][] dpPreviewOnPath;
    public boolean dpSampled;
    public int dpTotalRows;
    public int dpTotalCols;
}
