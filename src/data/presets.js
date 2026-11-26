/**
 * Curated Warehouse Inventory Scenarios for Optimization & Comparison
 */
const PRESETS = [
  {
    id: 'electronics-hub',
    name: 'Electronics Fulfillment Center',
    description: 'High-value consumer electronics & peripherals competing for Zone-A pallet capacity.',
    defaultCapacity: 120,
    unit: 'kg',
    currency: '$',
    items: [
      { id: 'EL-101', name: '4K OLED Monitor', category: 'Displays', weight: 18, profit: 620 },
      { id: 'EL-102', name: 'NVMe Enterprise SSD Pack', category: 'Storage', weight: 4, profit: 340 },
      { id: 'EL-103', name: 'Industrial UPS Battery', category: 'Power', weight: 32, profit: 480 },
      { id: 'EL-104', name: 'Workstation GPU Crate', category: 'Compute', weight: 14, profit: 780 },
      { id: 'EL-105', name: 'Smart PoE Switch 48-Port', category: 'Networking', weight: 22, profit: 510 },
      { id: 'EL-106', name: 'Mechanical Keyboard Bulk', category: 'Peripherals', weight: 15, profit: 270 },
      { id: 'EL-107', name: 'VR Headset Kit', category: 'Wearables', weight: 12, profit: 450 },
      { id: 'EL-108', name: 'Rackmount Server Chassis', category: 'Compute', weight: 40, profit: 890 },
      { id: 'EL-109', name: 'USB-C Dock Pallet', category: 'Peripherals', weight: 9, profit: 295 },
      { id: 'EL-110', name: 'Wi-Fi 7 Mesh Tri-Pack', category: 'Networking', weight: 11, profit: 390 }
    ]
  },
  {
    id: 'pharma-coldchain',
    name: 'Cold-Chain Medical Vault',
    description: 'Temperature-controlled pharmaceutical crates with strict refrigerated bay limits.',
    defaultCapacity: 80,
    unit: 'kg',
    currency: '$',
    items: [
      { id: 'PH-201', name: 'Insulin Biologics Box', category: 'Biologics', weight: 12, profit: 960 },
      { id: 'PH-202', name: 'Vaccine Thermal Container', category: 'Immunology', weight: 25, profit: 1500 },
      { id: 'PH-203', name: 'IV Saline Case', category: 'Fluids', weight: 30, profit: 420 },
      { id: 'PH-204', name: 'Diagnostic Reagent Pack', category: 'Lab', weight: 8, profit: 580 },
      { id: 'PH-205', name: 'Antibiotic Vials Tray', category: 'Acute Care', weight: 16, profit: 820 },
      { id: 'PH-206', name: 'Surgical Gel Packs', category: 'Supplies', weight: 18, profit: 310 },
      { id: 'PH-207', name: 'Monoclonal Antibody Unit', category: 'Biologics', weight: 10, profit: 1100 }
    ]
  },
  {
    id: 'greedy-trap',
    name: 'Greedy vs DP Edge Case ("Greedy Trap")',
    description: 'Classic counter-example: highest ratio item blocks two better-fitting items in 0/1 mode.',
    defaultCapacity: 50,
    unit: 'kg',
    currency: '$',
    items: [
      { id: 'GT-01', name: 'Modular Battery Array A', category: 'Energy', weight: 25, profit: 145 },
      { id: 'GT-02', name: 'Modular Battery Array B', category: 'Energy', weight: 25, profit: 145 },
      { id: 'GT-03', name: 'Precision Sensor Unit', category: 'Optics', weight: 10, profit: 55 },
      { id: 'GT-04', name: 'Heavy Copper Coil (Greedy Blocker)', category: 'Materials', weight: 41, profit: 250 }
    ]
  },
  {
    id: 'ecommerce-bulk',
    name: 'E-Commerce Express Dispatch',
    description: 'Mixed-density fulfillment SKUs for overnight air-freight container loading.',
    defaultCapacity: 150,
    unit: 'kg',
    currency: '$',
    items: [
      { id: 'EC-301', name: 'Running Shoes Assortment', category: 'Apparel', weight: 24, profit: 540 },
      { id: 'EC-302', name: 'Espresso Machine Crate', category: 'Appliances', weight: 35, profit: 790 },
      { id: 'EC-303', name: 'Smartwatch Gift Box', category: 'Wearables', weight: 6, profit: 510 },
      { id: 'EC-304', name: 'Carbon Tripod Bundle', category: 'Photography', weight: 14, profit: 420 },
      { id: 'EC-305', name: 'Noise-Canceling Headphones', category: 'Audio', weight: 10, profit: 560 },
      { id: 'EC-306', name: 'Cast Iron Cookware Set', category: 'Home', weight: 45, profit: 480 },
      { id: 'EC-307', name: 'Portable Solar Panel', category: 'Outdoor', weight: 28, profit: 690 },
      { id: 'EC-308', name: 'E-Reader Bulk Sleeve', category: 'Electronics', weight: 9, profit: 470 },
      { id: 'EC-309', name: 'Air Purifier Filter Pack', category: 'Home', weight: 20, profit: 340 }
    ]
  }
];

module.exports = { PRESETS };
