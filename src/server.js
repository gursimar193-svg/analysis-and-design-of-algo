const http = require('http');
const fs = require('fs');
const path = require('path');
const { solveFractionalKnapsack } = require('./algorithms/fractionalKnapsack');
const { solveZeroOneKnapsack } = require('./algorithms/zeroOneKnapsack');
const { runScalingBenchmark } = require('./algorithms/benchmark');
const { PRESETS } = require('./data/presets');
const { getJavaStatus, runJavaOptimization } = require('./services/javaBridge');

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function buildComparisonSummary(fractional, zeroOne) {
  const profitGap = Number((fractional.totalProfit - zeroOne.totalProfit).toFixed(4));
  const profitGapPct = zeroOne.totalProfit > 0
    ? Number(((profitGap / zeroOne.totalProfit) * 100).toFixed(2))
    : 0;
  const utilizationDiffPct = Number((fractional.utilizationPct - zeroOne.utilizationPct).toFixed(2));
  const greedy01Profit = fractional.greedyZeroOneHeuristic?.totalProfit ?? 0;
  const dpAdvantageOverGreedy01 = Number((zeroOne.totalProfit - greedy01Profit).toFixed(4));

  const gTime = Math.max(fractional.executionTimeMs, 0.0001);
  const dTime = Math.max(zeroOne.executionTimeMs, 0.0001);
  const fasterAlgorithm = gTime <= dTime ? 'Greedy (Fractional)' : 'Dynamic Programming (0/1)';
  const speedupFactor = gTime <= dTime
    ? Number((dTime / gTime).toFixed(2))
    : Number((gTime / dTime).toFixed(2));

  return {
    profitGap,
    profitGapPct,
    utilizationDiffPct,
    greedy01HeuristicProfit: greedy01Profit,
    dpAdvantageOverGreedy01,
    fasterAlgorithm,
    speedupFactor,
    recommendation:
      dpAdvantageOverGreedy01 > 0
        ? `If items cannot be split, Dynamic Programming outperforms naive Greedy 0/1 by $${dpAdvantageOverGreedy01.toFixed(2)}.`
        : profitGap > 0
          ? `Dividing partial stock unlocks $${profitGap.toFixed(2)} (+${profitGapPct}%) additional profit over whole-unit 0/1 packing.`
          : 'Both Greedy (Fractional) and DP (0/1) achieve the exact same optimal profit on this inventory.'
  };
}

function serveStaticFile(reqPath, res) {
  const cleanPath = reqPath === '/' ? '/index.html' : reqPath.split('?')[0];
  const resolved = path.resolve(PUBLIC_DIR, `.${cleanPath}`);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(resolved, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    const urlPath = (req.url || '/').split('?')[0];

    try {
      if (req.method === 'GET' && urlPath === '/api/health') {
        return sendJson(res, 200, {
          status: 'ok',
          nodeVersion: process.version,
          java: getJavaStatus(),
          timestamp: new Date().toISOString()
        });
      }

      if (req.method === 'GET' && urlPath === '/api/presets') {
        return sendJson(res, 200, { presets: PRESETS });
      }

      if (req.method === 'POST' && urlPath === '/api/optimize') {
        const body = await readJsonBody(req);
        const capacity = Number(body.capacity);
        const items = body.items;
        const requestedEngine = String(body.engine || 'node').toLowerCase();

        if (!Number.isFinite(capacity) || capacity < 0) {
          return sendJson(res, 400, { error: 'capacity must be a non-negative number' });
        }
        if (!Array.isArray(items)) {
          return sendJson(res, 400, { error: 'items must be an array' });
        }

        let fractional;
        let zeroOne;
        let activeEngine = 'Node.js';
        let engineNotice = null;

        if (requestedEngine === 'java') {
          try {
            const javaRes = await runJavaOptimization(items, capacity);
            fractional = javaRes.fractional;
            zeroOne = javaRes.zeroOne;
            activeEngine = 'Java';
          } catch (javaErr) {
            engineNotice = `${javaErr.message} Falling back to Node.js engine.`;
            fractional = solveFractionalKnapsack(items, capacity);
            zeroOne = solveZeroOneKnapsack(items, capacity);
            activeEngine = 'Node.js (Fallback)';
          }
        } else {
          fractional = solveFractionalKnapsack(items, capacity);
          zeroOne = solveZeroOneKnapsack(items, capacity);
        }

        return sendJson(res, 200, {
          engine: activeEngine,
          engineNotice,
          capacity,
          fractional,
          zeroOne,
          comparison: buildComparisonSummary(fractional, zeroOne)
        });
      }

      if (req.method === 'POST' && urlPath === '/api/benchmark') {
        const body = await readJsonBody(req);
        const report = runScalingBenchmark({
          itemCounts: Array.isArray(body.itemCounts) ? body.itemCounts : undefined,
          capacityFactor: Number(body.capacityFactor) || undefined,
          iterations: Number(body.iterations) || undefined
        });
        return sendJson(res, 200, report);
      }

      if (req.method === 'GET') {
        return serveStaticFile(urlPath, res);
      }

      sendJson(res, 405, { error: 'Method Not Allowed' });
    } catch (err) {
      const status = err instanceof RangeError || err instanceof TypeError || err.message.includes('Invalid')
        ? 400
        : 500;
      sendJson(res, status, { error: err.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const server = createServer();
  server.listen(port, () => {
    const javaStatus = getJavaStatus();
    console.log(`\nIntelligent Inventory Optimization Dashboard running at:`);
    console.log(`  -> http://localhost:${port}`);
    console.log(`  -> Node.js Engine: ${process.version}`);
    console.log(
      `  -> Java Engine:    ${
        javaStatus.available ? `Ready (${javaStatus.version})` : 'JDK not detected on PATH (Node.js active)'
      }\n`
    );
  });
}

module.exports = { createServer, buildComparisonSummary };
