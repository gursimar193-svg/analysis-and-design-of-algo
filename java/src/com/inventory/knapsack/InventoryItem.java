package com.inventory.knapsack;

/**
 * Represents a warehouse product with weight, profit, and computed profit-to-weight ratio.
 */
public class InventoryItem {
    private final String id;
    private final String name;
    private final String category;
    private final double weight;
    private final double profit;
    private final int originalIndex;

    public InventoryItem(String id, String name, String category, double weight, double profit, int originalIndex) {
        if (weight < 0) {
            throw new IllegalArgumentException("Weight cannot be negative for item: " + name);
        }
        if (profit < 0) {
            throw new IllegalArgumentException("Profit cannot be negative for item: " + name);
        }
        this.id = id;
        this.name = name;
        this.category = category == null || category.isEmpty() ? "General" : category;
        this.weight = weight;
        this.profit = profit;
        this.originalIndex = originalIndex;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public double getWeight() { return weight; }
    public double getProfit() { return profit; }
    public int getOriginalIndex() { return originalIndex; }

    public double getRatio() {
        if (weight == 0.0) {
            return profit > 0.0 ? Double.POSITIVE_INFINITY : 0.0;
        }
        return profit / weight;
    }
}
