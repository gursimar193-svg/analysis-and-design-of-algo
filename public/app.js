(() => {
  const state = {
    presets: [],
    activePresetId: null,
    items: [],
    capacity: 120,
    engine: 'node',
    javaAvailable: false,
    lastResult: null,
    lastBenchmark: null
  };

  const PALETTE = [
    '#38bdf8', '#34d399', '#fbbf24', '#a78bfa', '#f472b6',
    '#fb923c', '#2dd4bf', '#60a5fa', '#c084fc', '#4ade80'
  ];

  const el = (id) => document.getElementById(id);

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtMoney(val) {
    return '$' + Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtNum(val) {
    return Number(val || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  async function init() {
    bindEvents();
    await Promise.all([loadHealth(), loadPresets()]);
    await runOptimization();
  }

  function bindEvents() {
    el('presetSelect').addEventListener('change', (e) => {
      applyPreset(e.target.value);
      runOptimization();
    });

    let sliderTimer = null;
    el('capacitySlider').addEventListener('input', (e) => {
      const val = Number(e.target.value);
      state.capacity = val;
      el('capacityInput').value = val;
      el('capacityReadout').textContent = `${val} kg`;
      clearTimeout(sliderTimer);
      sliderTimer = setTimeout(runOptimization, 120);
    });

    el('capacityInput').addEventListener('change', (e) => {
      const val = Math.max(0, Number(e.target.value) || 0);
      state.capacity = val;
      el('capacitySlider').value = Math.min(val, Number(el('capacitySlider').max));
      el('capacityReadout').textContent = `${val} kg`;
      runOptimization();
    });

    el('addItemForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = el('itemName').value.trim();
      const category = el('itemCategory').value.trim() || 'Custom';
      const weight = Number(el('itemWeight').value);
      const profit = Number(el('itemProfit').value);

      if (!name || !Number.isFinite(weight) || weight < 0 || !Number.isFinite(profit) || profit < 0) {
        return;
      }

      state.items.push({
        id: `SKU-${Math.floor(100 + Math.random() * 900)}`,
        name,
        category,
        weight,
        profit
      });

      el('addItemForm').reset();
      renderInventoryTable();
      runOptimization();
    });

    el('btnAddRandom').addEventListener('click', () => {
      const adjectives = ['Smart', 'Industrial', 'Compact', 'Thermal', 'Precision', 'Modular'];
      const nouns = ['Router', 'Sensor', 'Battery', 'Scanner', 'Controller', 'Drive'];
      const cats = ['Electronics', 'Networking', 'Power', 'Hardware', 'Robotics'];
      const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
      const category = cats[Math.floor(Math.random() * cats.length)];
      const weight = Math.floor(Math.random() * 28) + 4;
      const profit = Math.floor(Math.random() * 700) + 120;

      state.items.push({
        id: `SKU-${Math.floor(100 + Math.random() * 900)}`,
        name,
        category,
        weight,
        profit
      });
      renderInventoryTable();
      runOptimization();
    });

    el('btnOptimize').addEventListener('click', runOptimization);

    el('btnExportJson').addEventListener('click', () => {
      if (!state.lastResult) return;
      const blob = new Blob([JSON.stringify(state.lastResult, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knapsack-optimization-report.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.engine = btn.dataset.engine;
        runOptimization();
      });
    });

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        el(`tab-${btn.dataset.tab}`).classList.add('active');
      });
    });

    el('btnRunBenchmark').addEventListener('click', runBenchmark);
  }

  async function loadHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      state.javaAvailable = Boolean(data.java && data.java.available);
      const pill = el('runtimeStatus');
      if (state.javaAvailable) {
        pill.textContent = `Node ${data.nodeVersion} & Java Ready`;
        pill.classList.remove('warn');
      } else {
        pill.textContent = `Node ${data.nodeVersion} (JDK not on PATH)`;
        pill.classList.add('warn');
      }
    } catch {
      el('runtimeStatus').textContent = 'Offline';
    }
  }

  async function loadPresets() {
    const res = await fetch('/api/presets');
    const data = await res.json();
    state.presets = data.presets || [];
    const select = el('presetSelect');
    select.innerHTML = state.presets
      .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`)
      .join('');
    if (state.presets.length > 0) {
      applyPreset(state.presets[0].id);
    }
  }

  function applyPreset(presetId) {
    const preset = state.presets.find((p) => p.id === presetId);
    if (!preset) return;
    state.activePresetId = preset.id;
    state.items = preset.items.map((item) => ({ ...item }));
    state.capacity = preset.defaultCapacity;

    el('presetDescription').textContent = preset.description;
    el('capacityInput').value = state.capacity;
    el('capacitySlider').max = Math.max(300, state.capacity * 2);
    el('capacitySlider').value = state.capacity;
    el('capacityReadout').textContent = `${state.capacity} kg`;

    renderInventoryTable();
  }

  function renderInventoryTable() {
    el('skuCountBadge').textContent = `${state.items.length} SKUs`;
    const tbody = el('inventoryTbody');
    tbody.innerHTML = state.items
      .map((item, idx) => {
        const ratio = item.weight > 0 ? (item.profit / item.weight).toFixed(2) : '∞';
        return `
          <tr>
            <td>
              <strong>${escapeHtml(item.name)}</strong>
              <span class="sku-sub">${escapeHtml(item.id)} &bull; ${escapeHtml(item.category)}</span>
            </td>
            <td class="num">${fmtNum(item.weight)} kg</td>
            <td class="num">${fmtMoney(item.profit)}</td>
            <td class="num">${ratio}</td>
            <td class="center">
              <button type="button" class="delete-btn" data-idx="${idx}">Remove</button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        state.items.splice(idx, 1);
        renderInventoryTable();
        runOptimization();
      });
    });
  }

  async function runOptimization() {
    const notice = el('engineNotice');
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capacity: state.capacity,
          items: state.items,
          engine: state.engine
        })
      });
      const data = await res.json();
      if (!res.ok) {
        notice.textContent = data.error || 'Optimization error';
        notice.classList.remove('hidden');
        return;
      }

      state.lastResult = data;
      if (data.engineNotice) {
        notice.textContent = data.engineNotice;
        notice.classList.remove('hidden');
      } else {
        notice.classList.add('hidden');
      }

      renderResults(data);
    } catch (err) {
      notice.textContent = `Request failed: ${err.message}`;
      notice.classList.remove('hidden');
    }
  }

  function renderResults(data) {
    const { fractional, zeroOne, comparison } = data;

    el('kpiGreedyProfit').textContent = fmtMoney(fractional.totalProfit);
    el('kpiGreedyMeta').textContent = `${fmtNum(fractional.totalWeight)} / ${fmtNum(fractional.capacity)} kg (${fractional.utilizationPct}%) • ${fractional.executionTimeMs} ms [${fractional.engine}]`;

    el('kpiDpProfit').textContent = fmtMoney(zeroOne.totalProfit);
    el('kpiDpMeta').textContent = `${fmtNum(zeroOne.totalWeight)} / ${fmtNum(zeroOne.capacity)} kg (${zeroOne.utilizationPct}%) • ${zeroOne.executionTimeMs} ms [${zeroOne.engine}]`;

    el('kpiProfitGap').textContent = fmtMoney(comparison.profitGap);
    el('kpiGapMeta').textContent = `+${comparison.profitGapPct}% gain if boundary item is divisible`;

    el('kpiDpAdvantage').textContent = fmtMoney(comparison.dpAdvantageOverGreedy01);
    el('kpiAdvantageMeta').textContent = `Naive Greedy 0/1: ${fmtMoney(comparison.greedy01HeuristicProfit)}`;

    el('recommendationBanner').innerHTML = `<strong>Warehouse Insight (${escapeHtml(data.engine)}):</strong> ${escapeHtml(comparison.recommendation)}`;

    renderComparisonBarChart(fractional, zeroOne, comparison);
    renderScatterChart(fractional, zeroOne);
    renderStackedBars(fractional, zeroOne);
    renderComparisonTable(fractional, zeroOne);
    renderGreedyTrace(fractional);
    renderDpMatrix(zeroOne);
  }

  function renderComparisonBarChart(fractional, zeroOne, comparison) {
    const bars = [
      { label: 'Greedy Fractional', profit: fractional.totalProfit, util: fractional.utilizationPct, color: '#38bdf8' },
      { label: 'DP Optimal (0/1)', profit: zeroOne.totalProfit, util: zeroOne.utilizationPct, color: '#34d399' },
      { label: 'Naive Greedy (0/1)', profit: comparison.greedy01HeuristicProfit, util: null, color: '#a78bfa' }
    ];

    const maxProfit = Math.max(1, ...bars.map((b) => b.profit));
    const width = 460;
    const height = 210;
    const padL = 135;
    const padR = 78;
    const barAreaW = width - padL - padR;

    const rows = bars.map((b, i) => {
      const y = 26 + i * 56;
      const bw = Math.max(4, (b.profit / maxProfit) * barAreaW);
      const utilTxt = b.util !== null ? ` (${b.util}% cap)` : ' (heuristic)';
      return `
        <text x="${padL - 10}" y="${y + 18}" text-anchor="end" fill="#cbd5e1" font-size="12" font-weight="600">${escapeHtml(b.label)}</text>
        <rect x="${padL}" y="${y}" width="${barAreaW}" height="28" rx="6" fill="#1e293b" />
        <rect x="${padL}" y="${y}" width="${bw}" height="28" rx="6" fill="${b.color}" />
        <text x="${padL + bw + 8}" y="${y + 14}" fill="#f8fafc" font-size="12" font-weight="700">${fmtMoney(b.profit)}</text>
        <text x="${padL + bw + 8}" y="${y + 27}" fill="#94a3b8" font-size="10">${utilTxt}</text>
      `;
    }).join('');

    el('comparisonBarChart').innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="210">
        ${rows}
      </svg>
    `;
  }

  function renderScatterChart(fractional, zeroOne) {
    const greedyMap = new Map(fractional.selections.map((s) => [String(s.id), s]));
    const dpMap = new Map(zeroOne.selections.map((s) => [String(s.id), s]));

    const items = state.items;
    const maxW = Math.max(10, ...items.map((i) => i.weight)) * 1.1;
    const maxP = Math.max(10, ...items.map((i) => i.profit)) * 1.1;

    const W = 460;
    const H = 210;
    const pad = { l: 46, r: 18, t: 16, b: 32 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const points = items.map((item) => {
      const cx = pad.l + (item.weight / maxW) * pw;
      const cy = pad.t + ph - (item.profit / maxP) * ph;
      const gSel = greedyMap.get(String(item.id));
      const dSel = dpMap.get(String(item.id));
      const inDp = dSel && dSel.fraction > 0;
      const inGreedy = gSel && gSel.fraction > 0;
      const fill = inDp ? '#34d399' : '#475569';
      const stroke = inGreedy ? '#38bdf8' : '#0f172a';
      const sw = inGreedy ? 2.5 : 1;
      const r = inGreedy || inDp ? 6.5 : 5;
      return `
        <g>
          <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}">
            <title>${escapeHtml(item.name)}: ${item.weight}kg, ${fmtMoney(item.profit)}</title>
          </circle>
        </g>
      `;
    }).join('');

    el('scatterChart').innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="210">
        <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + ph}" stroke="#334155" />
        <line x1="${pad.l}" y1="${pad.t + ph}" x2="${pad.l + pw}" y2="${pad.t + ph}" stroke="#334155" />
        <text x="${pad.l + pw / 2}" y="${H - 6}" text-anchor="middle" fill="#94a3b8" font-size="11">Weight (kg)</text>
        <text x="14" y="${pad.t + ph / 2}" text-anchor="middle" fill="#94a3b8" font-size="11" transform="rotate(-90 14 ${pad.t + ph / 2})">Profit ($)</text>
        ${points}
      </svg>
    `;
  }

  function renderStackedBars(fractional, zeroOne) {
    const colorMap = new Map();
    state.items.forEach((it, idx) => colorMap.set(String(it.id), PALETTE[idx % PALETTE.length]));

    const buildSegments = (res) => {
      if (res.capacity <= 0) return '';
      return res.selections
        .filter((s) => s.takenWeight > 0)
        .map((s) => {
          const pct = (s.takenWeight / res.capacity) * 100;
          const color = colorMap.get(String(s.id)) || '#38bdf8';
          const label = pct >= 9 ? escapeHtml(s.name.split(' ')[0]) : '';
          return `<div class="bar-segment" style="width:${pct.toFixed(2)}%;background:${color};" title="${escapeHtml(s.name)}: ${s.takenWeight} kg (${Math.round(s.fraction * 100)}%)">${label}</div>`;
        })
        .join('');
    };

    el('greedyBarLabel').textContent = `${fmtNum(fractional.totalWeight)} / ${fmtNum(fractional.capacity)} kg (${fractional.utilizationPct}%)`;
    el('dpBarLabel').textContent = `${fmtNum(zeroOne.totalWeight)} / ${fmtNum(zeroOne.capacity)} kg (${zeroOne.utilizationPct}%)`;
    el('greedyStackedBar').innerHTML = buildSegments(fractional);
    el('dpStackedBar').innerHTML = buildSegments(zeroOne);
  }

  function decisionBadge(sel) {
    if (sel.decision === 'FULL') return '<span class="badge badge-full">FULL (100%)</span>';
    if (sel.decision === 'PARTIAL') {
      return `<span class="badge badge-partial">PARTIAL (${(sel.fraction * 100).toFixed(1)}%)</span>`;
    }
    return '<span class="badge badge-skipped">SKIPPED</span>';
  }

  function renderComparisonTable(fractional, zeroOne) {
    const greedyMap = new Map(fractional.selections.map((s) => [String(s.id), s]));
    const dpMap = new Map(zeroOne.selections.map((s) => [String(s.id), s]));

    el('comparisonTbody').innerHTML = state.items
      .map((item) => {
        const g = greedyMap.get(String(item.id)) || { decision: 'SKIPPED', earnedProfit: 0, ratio: 0 };
        const d = dpMap.get(String(item.id)) || { decision: 'SKIPPED', earnedProfit: 0 };
        return `
          <tr>
            <td><strong>${escapeHtml(item.name)}</strong><span class="sku-sub">${escapeHtml(item.id)}</span></td>
            <td class="num">${fmtNum(item.weight)} kg</td>
            <td class="num">${fmtMoney(item.profit)}</td>
            <td class="num">${g.ratio}</td>
            <td class="center">${decisionBadge(g)}</td>
            <td class="num">${fmtMoney(g.earnedProfit)}</td>
            <td class="center">${decisionBadge(d)}</td>
            <td class="num">${fmtMoney(d.earnedProfit)}</td>
          </tr>
        `;
      })
      .join('');
  }

  function renderGreedyTrace(fractional) {
    el('traceTbody').innerHTML = (fractional.trace || [])
      .map((t) => `
        <tr>
          <td class="center">${t.step}</td>
          <td><strong>${escapeHtml(t.itemName)}</strong> <span class="sku-sub">${escapeHtml(t.itemId)}</span></td>
          <td class="num">${t.ratio}</td>
          <td class="center">${decisionBadge({ decision: t.decision, fraction: t.fraction })}</td>
          <td class="num">${(t.fraction * 100).toFixed(2)}%</td>
          <td class="num">${fmtNum(t.remainingCapacityAfter)} kg</td>
        </tr>
      `)
      .join('');
  }

  function renderDpMatrix(zeroOne) {
    const preview = zeroOne.dpTablePreview;
    if (!preview || !preview.cells || preview.cells.length === 0) {
      el('dpMatrixContainer').innerHTML = '<p class="helper-text" style="padding:12px;">No DP matrix available.</p>';
      return;
    }

    el('dpMatrixSummary').innerHTML = `
      <strong>Dynamic Programming Table:</strong> Computed <code>${zeroOne.dpStatesComputed.toLocaleString()}</code> states
      (${preview.totalRows} rows &times; ${preview.totalCols} cols${preview.sampled ? ', sampled preview' : ''}; scale factor &times;${zeroOne.scaleFactor}).
      Green outlined cells highlight the optimal backtracking path.
    `;

    const headers = preview.colIndices
      .map((c) => `<th>w=${(c / zeroOne.scaleFactor).toFixed(zeroOne.scaleFactor > 1 ? 1 : 0)}</th>`)
      .join('');

    const rows = preview.cells
      .map((rowCells, idx) => {
        const rIdx = preview.rowIndices[idx];
        const label = rIdx === 0 ? 'i=0 (∅)' : `i=${rIdx}`;
        const tds = rowCells
          .map((cell) => `<td class="${cell.onOptimalPath ? 'dp-cell-path' : ''}">${cell.value}</td>`)
          .join('');
        return `<tr><th>${label}</th>${tds}</tr>`;
      })
      .join('');

    el('dpMatrixContainer').innerHTML = `
      <table class="dp-table">
        <thead><tr><th>Item \\ Cap</th>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  async function runBenchmark() {
    const btn = el('btnRunBenchmark');
    btn.disabled = true;
    btn.textContent = 'Running Benchmark...';
    try {
      const res = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iterations: 3 })
      });
      const report = await res.json();
      state.lastBenchmark = report;
      renderBenchmark(report);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Run Scaling Benchmark';
    }
  }

  function renderBenchmark(report) {
    const pts = report.points || [];
    if (pts.length === 0) return;

    const W = 760;
    const H = 260;
    const pad = { l: 55, r: 24, t: 22, b: 36 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;

    const maxN = Math.max(...pts.map((p) => p.itemCount));
    const maxT = Math.max(0.5, ...pts.map((p) => Math.max(p.greedyTimeMs, p.dpTimeMs))) * 1.15;

    const xOf = (n) => pad.l + (n / maxN) * pw;
    const yOf = (t) => pad.t + ph - (t / maxT) * ph;

    const greedyPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.itemCount).toFixed(1)},${yOf(p.greedyTimeMs).toFixed(1)}`).join(' ');
    const dpPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.itemCount).toFixed(1)},${yOf(p.dpTimeMs).toFixed(1)}`).join(' ');

    const dots = pts.map((p) => `
      <circle cx="${xOf(p.itemCount).toFixed(1)}" cy="${yOf(p.greedyTimeMs).toFixed(1)}" r="4" fill="#38bdf8">
        <title>N=${p.itemCount}: Greedy ${p.greedyTimeMs} ms</title>
      </circle>
      <circle cx="${xOf(p.itemCount).toFixed(1)}" cy="${yOf(p.dpTimeMs).toFixed(1)}" r="4" fill="#34d399">
        <title>N=${p.itemCount}: DP ${p.dpTimeMs} ms</title>
      </circle>
    `).join('');

    el('benchmarkChart').innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" width="100%" height="260">
        <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + ph}" stroke="#334155" />
        <line x1="${pad.l}" y1="${pad.t + ph}" x2="${pad.l + pw}" y2="${pad.t + ph}" stroke="#334155" />
        <path d="${greedyPath}" fill="none" stroke="#38bdf8" stroke-width="2.5" />
        <path d="${dpPath}" fill="none" stroke="#34d399" stroke-width="2.5" />
        ${dots}
        <text x="${pad.l + 12}" y="${pad.t + 14}" fill="#38bdf8" font-size="12" font-weight="700">— Greedy Fractional O(n log n)</text>
        <text x="${pad.l + 230}" y="${pad.t + 14}" fill="#34d399" font-size="12" font-weight="700">— DP 0/1 O(n · W)</text>
        <text x="${pad.l + pw / 2}" y="${H - 8}" text-anchor="middle" fill="#94a3b8" font-size="11">Number of Products (N)</text>
        <text x="16" y="${pad.t + ph / 2}" text-anchor="middle" fill="#94a3b8" font-size="11" transform="rotate(-90 16 ${pad.t + ph / 2})">Exec Time (ms)</text>
      </svg>
    `;

    el('benchmarkTbody').innerHTML = pts
      .map((p) => `
        <tr>
          <td class="num">${p.itemCount}</td>
          <td class="num">${p.capacity} kg</td>
          <td class="num">${p.greedyTimeMs.toFixed(4)} ms</td>
          <td class="num">${p.dpTimeMs.toFixed(4)} ms</td>
          <td class="num">${p.speedupRatio}x</td>
          <td class="num">${fmtMoney(p.greedyProfit)}</td>
          <td class="num">${fmtMoney(p.dpProfit)}</td>
        </tr>
      `)
      .join('');
  }

  init();
})();
