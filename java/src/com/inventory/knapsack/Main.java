package com.inventory.knapsack;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Entry point for the Java Knapsack Inventory Optimization Engine.
 * Supports:
 *   1) `--json` mode for Node.js dashboard integration (reads JSON on stdin, prints JSON to stdout)
 *   2) Default standalone CLI demonstration with side-by-side comparison table
 */
public class Main {

    public static void main(String[] args) throws Exception {
        if (args.length > 0 && "--json".equals(args[0])) {
            runJsonBridge();
            return;
        }
        runCliDemo();
    }

    @SuppressWarnings("unchecked")
    private static void runJsonBridge() throws Exception {
        StringBuilder input = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                input.append(line);
            }
        }

        Object parsed = JsonHelper.parse(input.toString());
        if (!(parsed instanceof Map)) {
            throw new IllegalArgumentException("Expected top-level JSON object");
        }
        Map<String, Object> root = (Map<String, Object>) parsed;
        double capacity = ((Number) root.get("capacity")).doubleValue();
        List<Object> rawItems = (List<Object>) root.get("items");

        List<InventoryItem> items = new ArrayList<>();
        for (int i = 0; i < rawItems.size(); i++) {
            Map<String, Object> row = (Map<String, Object>) rawItems.get(i);
            String id = row.get("id") != null ? String.valueOf(row.get("id")) : String.valueOf(i + 1);
            String name = row.get("name") != null ? String.valueOf(row.get("name")) : "Product-" + (i + 1);
            String category = row.get("category") != null ? String.valueOf(row.get("category")) : "General";
            double weight = ((Number) row.get("weight")).doubleValue();
            double profit = ((Number) row.get("profit")).doubleValue();
            items.add(new InventoryItem(id, name, category, weight, profit, i));
        }

        KnapsackResult fractional = GreedyFractionalSolver.solve(items, capacity);
        KnapsackResult zeroOne = DynamicProgrammingSolver.solve(items, capacity);

        StringBuilder out = new StringBuilder();
        out.append("{");
        out.append("\"engine\":\"Java\",");
        out.append("\"fractional\":").append(JsonHelper.serializeResult(fractional, false)).append(",");
        out.append("\"zeroOne\":").append(JsonHelper.serializeResult(zeroOne, true));
        out.append("}");
        System.out.println(out.toString());
    }

    private static void runCliDemo() {
        double capacity = 120.0;
        List<InventoryItem> items = Arrays.asList(
            new InventoryItem("EL-101", "4K OLED Monitor", "Displays", 18, 620, 0),
            new InventoryItem("EL-102", "NVMe Enterprise SSD Pack", "Storage", 4, 340, 1),
            new InventoryItem("EL-103", "Industrial UPS Battery", "Power", 32, 480, 2),
            new InventoryItem("EL-104", "Workstation GPU Crate", "Compute", 14, 780, 3),
            new InventoryItem("EL-105", "Smart PoE Switch 48-Port", "Networking", 22, 510, 4),
            new InventoryItem("EL-106", "Mechanical Keyboard Bulk", "Peripherals", 15, 270, 5),
            new InventoryItem("EL-107", "VR Headset Kit", "Wearables", 12, 450, 6),
            new InventoryItem("EL-108", "Rackmount Server Chassis", "Compute", 40, 890, 7),
            new InventoryItem("EL-109", "USB-C Dock Pallet", "Peripherals", 9, 295, 8),
            new InventoryItem("EL-110", "Wi-Fi 7 Mesh Tri-Pack", "Networking", 11, 390, 9)
        );

        KnapsackResult greedy = GreedyFractionalSolver.solve(items, capacity);
        KnapsackResult dp = DynamicProgrammingSolver.solve(items, capacity);

        System.out.println("=================================================================");
        System.out.println("  Intelligent Inventory Management - Java Optimization Engine    ");
        System.out.println("  Warehouse Capacity: " + capacity + " kg | Products: " + items.size());
        System.out.println("=================================================================\n");

        printResultSummary(greedy);
        System.out.println();
        printResultSummary(dp);

        double gap = Math.round((greedy.totalProfit - dp.totalProfit) * 100.0) / 100.0;
        System.out.println("\n--- Comparison Summary ---");
        System.out.printf("Divisibility Premium (Fractional - 0/1 DP): $%.2f%n", gap);
        System.out.printf("Naive Greedy 0/1 Heuristic Profit: $%.2f (vs DP Optimal $%.2f)%n",
            greedy.greedy01HeuristicProfit, dp.totalProfit);
    }

    private static void printResultSummary(KnapsackResult res) {
        System.out.println("[" + res.algorithm + "] (" + res.timeComplexity + ")");
        System.out.printf("  Total Profit: $%.2f | Used Weight: %.2f / %.2f kg (%.2f%%) | Time: %.4f ms%n",
            res.totalProfit, res.totalWeight, res.capacity, res.utilizationPct, res.executionTimeMs);
        System.out.println("  Selected Products:");
        for (KnapsackResult.SelectionEntry s : res.selections) {
            if (s.fraction > 0) {
                System.out.printf("    - %-28s | %-7s (%6.2f%%) | W: %6.2f kg | P: $%8.2f%n",
                    s.name, s.decision, s.fraction * 100.0, s.takenWeight, s.earnedProfit);
            }
        }
    }
}
