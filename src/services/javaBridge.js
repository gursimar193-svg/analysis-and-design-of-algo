const fs = require('fs');
const path = require('path');
const { spawn, execFileSync, spawnSync } = require('child_process');

const JAVA_SRC_DIR = path.resolve(__dirname, '../../java/src');
const JAVA_OUT_DIR = path.resolve(__dirname, '../../java/out');
const JAVA_PKG_DIR = path.join(JAVA_SRC_DIR, 'com/inventory/knapsack');

function checkCommand(cmd, args = ['-version']) {
  try {
    execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

function getJavaStatus() {
  const hasJava = checkCommand('java', ['-version']);
  const hasJavac = checkCommand('javac', ['-version']);
  let version = null;
  if (hasJava) {
    const res = spawnSync('java', ['-version'], { encoding: 'utf8', timeout: 3000 });
    const combined = `${res.stdout || ''}\n${res.stderr || ''}`.trim();
    version = combined.split(/\r?\n/)[0].trim() || 'Java Runtime detected';
  }
  return {
    available: hasJava && hasJavac,
    hasJava,
    hasJavac,
    version,
    sourceDir: JAVA_SRC_DIR
  };
}

function needsCompile() {
  const mainClass = path.join(JAVA_OUT_DIR, 'com/inventory/knapsack/Main.class');
  if (!fs.existsSync(mainClass)) return true;
  const classMtime = fs.statSync(mainClass).mtimeMs;
  const javaFiles = fs.readdirSync(JAVA_PKG_DIR).filter((f) => f.endsWith('.java'));
  return javaFiles.some((f) => fs.statSync(path.join(JAVA_PKG_DIR, f)).mtimeMs > classMtime);
}

function ensureCompiled() {
  const status = getJavaStatus();
  if (!status.available) {
    throw new Error('Java JDK (java/javac) is not installed or not on PATH. Using Node.js engine instead.');
  }
  if (!fs.existsSync(JAVA_OUT_DIR)) {
    fs.mkdirSync(JAVA_OUT_DIR, { recursive: true });
  }
  if (needsCompile()) {
    const javaFiles = fs
      .readdirSync(JAVA_PKG_DIR)
      .filter((f) => f.endsWith('.java'))
      .map((f) => path.join(JAVA_PKG_DIR, f));
    execFileSync('javac', ['-d', JAVA_OUT_DIR, ...javaFiles], { stdio: 'pipe', timeout: 15000 });
  }
}

function runJavaOptimization(items, capacity) {
  return new Promise((resolve, reject) => {
    try {
      ensureCompiled();
    } catch (err) {
      return reject(err);
    }

    const child = spawn('java', ['-cp', JAVA_OUT_DIR, 'com.inventory.knapsack.Main', '--json'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Java optimization process timed out after 10s'));
    }, 10000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(stderr.trim() || `Java exited with code ${code}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (parseErr) {
        reject(new Error(`Failed to parse Java output: ${parseErr.message}`));
      }
    });

    child.stdin.write(JSON.stringify({ capacity, items }));
    child.stdin.end();
  });
}

module.exports = { getJavaStatus, ensureCompiled, runJavaOptimization };
