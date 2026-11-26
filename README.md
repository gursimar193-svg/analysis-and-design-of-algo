# Intelligent Inventory Management Using Knapsack Optimization

**Capstone Project 2** — A warehouse inventory selection system with a working interactive web dashboard built using **Node.js** and **Java**, implementing and comparing **Greedy (Fractional Knapsack)** and **Dynamic Programming (0/1 Knapsack)** approaches.

---

## Problem Statement

Develop an inventory selection system that helps a warehouse manager select products to maximize total profit without exceeding a given storage capacity. Each product has a weight and profit value. Implement both **Greedy (Fractional Knapsack)** and **Dynamic Programming (0/1 Knapsack)** approaches and compare their results and performance.

---

## Algorithms Implemented

| Approach | Problem Model | Time Complexity | Space Complexity | Key Insight |
| :--- | :--- | :--- | :--- | :--- |
| **Greedy (Fractional Knapsack)** | Divisible / bulk stock (items can be split) | `O(n log n)` | `O(n)` | Sorts items descending by `profit / weight` ratio. Optimal for fractional stock; ultra-fast scaling. |
| **Dynamic Programming (0/1 Knapsack)** | Indivisible units / sealed pallets | `O(n · W)` | `O(n · W)` | Evaluates `dp[i][w] = max(dp[i-1][w], dp[i-1][w-w_i] + p_i)` with backtracking. Guarantees whole-unit optimality where naive Greedy 0/1 fails. |

---

## Project Structure

```
intelligent-inventory-knapsack/
├── .vscode/                   # VS Code launch, tasks, settings & recommended extensions
├── java/src/com/inventory/knapsack/
│   ├── InventoryItem.java     # Product model & ratio calculation
│   ├── KnapsackResult.java    # Structured optimization output
│   ├── GreedyFractionalSolver.java
│   ├── DynamicProgrammingSolver.java
│   ├── JsonHelper.java        # Zero-dependency JSON IPC bridge
│   ├── Main.java              # CLI demo & `--json` stdin/stdout bridge
│   └── KnapsackTest.java      # Java unit assertions
├── src/
│   ├── server.js              # Zero-dependency Node.js HTTP server & REST API
│   ├── algorithms/
│   │   ├── fractionalKnapsack.js
│   │   ├── zeroOneKnapsack.js
│   │   └── benchmark.js       # Empirical scaling benchmark
│   ├── services/
│   │   └── javaBridge.js      # Auto-compiles & invokes Java solver if JDK is on PATH
│   └── data/
│       └── presets.js         # Curated warehouse datasets (including Greedy Trap)
├── public/                    # Working Interactive Dashboard (HTML/CSS/JS + SVG charts)
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── tests/
    └── knapsack.test.js       # Node.js built-in test suite
```

---

## Quick Start

### 1. Run the Dashboard (Node.js)
```bash
npm start
```
Then open **http://localhost:3000** in your browser.

### 2. Run Tests & Benchmarks
```bash
npm test
npm run benchmark
```

### 3. Run the Java Implementation (Requires JDK 11+ on `PATH`)
```bash
mkdir -p java/out
javac -d java/out java/src/com/inventory/knapsack/*.java
java -cp java/out com.inventory.knapsack.Main
java -cp java/out com.inventory.knapsack.KnapsackTest
```
When a Java JDK is installed on `PATH`, you can also switch the **Engine** toggle in the dashboard top bar from **Node.js** to **Java** to execute optimizations directly through the Java engine!
