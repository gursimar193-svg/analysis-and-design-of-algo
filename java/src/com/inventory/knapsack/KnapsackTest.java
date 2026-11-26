package com.inventory.knapsack;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Standalone Java verification suite for Greedy Fractional and 0/1 DP solvers.
 */
public class KnapsackTest {

    private static void assertAlmostEqual(double actual, double expected, String label) {
        if (Math.abs(actual - expected) > 1e-4) {
            throw new AssertionError(label + " -> expected " + expected + ", got " + actual);
        }
    }

    public static void main(String[] args) {
        // 1. Classic Greedy Trap
        List<InventoryItem> trap = Arrays.asList(
            new InventoryItem("GT-01", "Battery A", "Energy", 25, 145, 0),
            new InventoryItem("GT-02", "Battery B", "Energy", 25, 145, 1),
            new InventoryItem("GT-03", "Sensor", "Optics", 10, 55, 2),
            new InventoryItem("GT-04", "Copper Coil", "Materials", 41, 250, 3)
        );
        KnapsackResult greedyTrap = GreedyFractionalSolver.solve(trap, 50);
        KnapsackResult dpTrap = DynamicProgrammingSolver.solve(trap, 50);

        assertAlmostEqual(greedyTrap.totalProfit, 302.2, "Fractional Greedy Trap Profit");
        assertAlmostEqual(greedyTrap.greedy01HeuristicProfit, 250.0, "Naive Greedy 0/1 Profit");
        assertAlmostEqual(dpTrap.totalProfit, 290.0, "DP 0/1 Optimal Profit");
        assertAlmostEqual(dpTrap.totalWeight, 50.0, "DP 0/1 Weight");

        // 2. Zero capacity edge case
        KnapsackResult zeroCapGreedy = GreedyFractionalSolver.solve(trap, 0);
        KnapsackResult zeroCapDp = DynamicProgrammingSolver.solve(trap, 0);
        assertAlmostEqual(zeroCapGreedy.totalProfit, 0.0, "Zero capacity greedy");
        assertAlmostEqual(zeroCapDp.totalProfit, 0.0, "Zero capacity DP");

        // 3. Empty inventory
        KnapsackResult emptyGreedy = GreedyFractionalSolver.solve(Collections.emptyList(), 100);
        KnapsackResult emptyDp = DynamicProgrammingSolver.solve(Collections.emptyList(), 100);
        assertAlmostEqual(emptyGreedy.totalProfit, 0.0, "Empty list greedy");
        assertAlmostEqual(emptyDp.totalProfit, 0.0, "Empty list DP");

        System.out.println("All Java KnapsackTest assertions passed!");
    }
}
