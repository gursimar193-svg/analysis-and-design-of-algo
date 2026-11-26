package com.inventory.knapsack;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Greedy Fractional Knapsack Solver (Java).
 * Time Complexity:  O(n log n)
 * Space Complexity: O(n)
 */
public class GreedyFractionalSolver {

    private static double roundTo(double value, int decimals) {
        if (!Double.isFinite(value)) return value;
        double factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    public static KnapsackResult solve(List<InventoryItem> items, double capacity) {
        long startNs = System.nanoTime();
        double maxCapacity = Math.max(0.0, capacity);

        List<InventoryItem> sorted = new ArrayList<>(items);
        sorted.sort(new Comparator<InventoryItem>() {
            @Override
            public int compare(InventoryItem a, InventoryItem b) {
                int cmp = Double.compare(b.getRatio(), a.getRatio());
                if (cmp != 0) return cmp;
                cmp = Double.compare(b.getProfit(), a.getProfit());
                if (cmp != 0) return cmp;
                cmp = Double.compare(a.getWeight(), b.getWeight());
                if (cmp != 0) return cmp;
                return Integer.compare(a.getOriginalIndex(), b.getOriginalIndex());
            }
        });

        double remaining = maxCapacity;
        double totalWeight = 0.0;
        double totalProfit = 0.0;

        double greedy01Remaining = maxCapacity;
        double greedy01Profit = 0.0;
        double greedy01Weight = 0.0;

        List<KnapsackResult.SelectionEntry> selections = new ArrayList<>();
        List<KnapsackResult.TraceStep> trace = new ArrayList<>();

        int fullCount = 0;
        int partialCount = 0;
        int selectedCount = 0;

        for (int step = 0; step < sorted.size(); step++) {
            InventoryItem item = sorted.get(step);

            if (item.getWeight() <= greedy01Remaining) {
                greedy01Remaining -= item.getWeight();
                greedy01Weight += item.getWeight();
                greedy01Profit += item.getProfit();
            }

            double fraction = 0.0;
            double takenWeight = 0.0;
            double earnedProfit = 0.0;
            String decision = "SKIPPED";

            if (item.getWeight() == 0.0) {
                fraction = 1.0;
                takenWeight = 0.0;
                earnedProfit = item.getProfit();
                decision = "FULL";
                totalProfit += earnedProfit;
            } else if (remaining > 0.0) {
                if (item.getWeight() <= remaining) {
                    fraction = 1.0;
                    takenWeight = item.getWeight();
                    earnedProfit = item.getProfit();
                    remaining -= item.getWeight();
                    decision = "FULL";
                } else {
                    fraction = remaining / item.getWeight();
                    takenWeight = remaining;
                    earnedProfit = item.getProfit() * fraction;
                    remaining = 0.0;
                    decision = "PARTIAL";
                }
                totalWeight += takenWeight;
                totalProfit += earnedProfit;
            }

            if (fraction > 0.0) selectedCount++;
            if ("FULL".equals(decision)) fullCount++;
            if ("PARTIAL".equals(decision)) partialCount++;

            selections.add(new KnapsackResult.SelectionEntry(
                item.getId(),
                item.getName(),
                item.getCategory(),
                item.getWeight(),
                item.getProfit(),
                roundTo(item.getRatio(), 4),
                roundTo(fraction, 6),
                roundTo(takenWeight, 4),
                roundTo(earnedProfit, 4),
                decision
            ));

            trace.add(new KnapsackResult.TraceStep(
                step + 1,
                item.getId(),
                item.getName(),
                roundTo(item.getRatio(), 4),
                decision,
                roundTo(fraction, 4),
                roundTo(remaining, 4)
            ));
        }

        double elapsedMs = (System.nanoTime() - startNs) / 1_000_000.0;
        double utilizationPct = maxCapacity > 0.0 ? roundTo((totalWeight / maxCapacity) * 100.0, 2) : 0.0;

        KnapsackResult res = new KnapsackResult();
        res.algorithm = "Greedy (Fractional Knapsack)";
        res.engine = "Java";
        res.timeComplexity = "O(n log n)";
        res.spaceComplexity = "O(n)";
        res.capacity = maxCapacity;
        res.totalItemsEvaluated = items.size();
        res.selectedCount = selectedCount;
        res.fullCount = fullCount;
        res.partialCount = partialCount;
        res.totalWeight = roundTo(totalWeight, 4);
        res.totalProfit = roundTo(totalProfit, 4);
        res.utilizationPct = utilizationPct;
        res.executionTimeMs = roundTo(elapsedMs, 4);
        res.greedy01HeuristicProfit = roundTo(greedy01Profit, 4);
        res.greedy01HeuristicWeight = roundTo(greedy01Weight, 4);
        res.selections = selections;
        res.trace = trace;
        return res;
    }
}
