#!/usr/bin/env node
/**
 * VENT MACHINE v4 - UNIVERSAL LAUNCHER
 * Boots backend proxy + frontend with Kimi/Moonshot
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

// ANSI colors
const c = {
  r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', b: '\x1b[34m', m: '\x1b[35m', c: '\x1b[36m', reset: '\x1b[0m'
};

function log(msg, color = 'reset') {
  console.log(`${c[color]}${msg}${c.reset}`);
}

log('🎭=====================================', 'm');
log('  VENT MACHINE v4 - KIMI EDITION', 'm');
log('=====================================', 'm');

// Config
const MOONSHOT_KEY = process.env.MOONSHOT_API_KEY || '';
const PROXY_PORT = 3002;
const FRONTEND_PORT = 3000;

if (!MOONSHOT_KEY) {
  log('⚠️ WARNING: MOONSHOT_API_KEY is not set. API calls may fail.', 'y');
}

const processes = [];

function cleanup() {
  log('\n🛑 Shutting down...', 'y');
  processes.forEach(p => p.kill());
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start Backend Proxy
log('\n[1/3] Starting Backend Proxy...', 'b');
const proxy = spawn('node', ['proxy.cjs'], {
  cwd: path.join(__dirname, 'api'),
  env: { ...process.env, MOONSHOT_API_KEY: MOONSHOT_KEY, PORT: PROXY_PORT.toString() },
  stdio: 'pipe'
});
processes.push(proxy);

proxy.stdout.on('data', (data) => {
  console.log(`[PROXY] ${data.toString().trim()}`);
});
proxy.stderr.on('data', (data) => {
  console.log(`[PROXY] ${data.toString().trim()}`);
});

// Wait for backend then start frontend
setTimeout(() => {
  // Check health
  http.get(`http://localhost:${PROXY_PORT}/health`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const health = JSON.parse(data);
        log(`[2/3] Backend healthy: ${health.status}`, 'g');
      } catch (e) {
        log('[2/3] Backend responded (unknown health)', 'y');
      }
    });
  }).on('error', () => {
    log('[2/3] Backend not responding yet (will retry)', 'y');
  });

  // Start Frontend
  log('[3/3] Starting Frontend...', 'b');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    env: { ...process.env, PORT: FRONTEND_PORT.toString() },
    stdio: 'pipe'
  });
  processes.push(frontend);

  let frontendReady = false;
  frontend.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (line.includes('ready') || line.includes('http://localhost')) {
      if (!frontendReady) {
        frontendReady = true;
        showReady();
      }
    }
    console.log(`[FRONTEND] ${line}`);
  });
  frontend.stderr.on('data', (data) => {
    console.log(`[FRONTEND] ${data.toString().trim()}`);
  });

}, 3000);

function showReady() {
  setTimeout(() => {
    log('\n=====================================', 'g');
    log('🎉 VENT MACHINE IS RUNNING!', 'g');
    log('=====================================', 'g');
    log(`\n📱 Frontend: http://localhost:${FRONTEND_PORT}`, 'c');
    log(`🔌 Backend:  http://localhost:${PROXY_PORT}/health`, 'c');
    log('\n🔑 Provider: MOONSHOT (Kimi AI)', 'm');
    log('🤖 Model: moonshot-v1-8k', 'm');
    log('\n⚡ PULL THE LEVER!', 'y');
    log('\nPress Ctrl+C to stop', 'reset');
  }, 2000);
}

// Keep alive
setInterval(() => {}, 1000);
