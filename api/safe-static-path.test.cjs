'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { resolveStaticAssetPath } = require('./safe-static-path.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vent-static-path-'));
  const dist = path.join(root, 'dist');
  const assets = path.join(dist, 'assets');
  fs.mkdirSync(assets, { recursive: true });
  fs.writeFileSync(path.join(assets, 'app.js'), 'console.log("safe");');
  fs.writeFileSync(path.join(root, 'secret.txt'), 'do not serve');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, dist, assets };
}

test('serves a real asset and ignores its query string', (t) => {
  const { dist, assets } = fixture(t);
  assert.equal(
    resolveStaticAssetPath(dist, '/assets/app.js?v=1'),
    fs.realpathSync(path.join(assets, 'app.js'))
  );
});

test('rejects literal traversal outside dist', (t) => {
  const { dist } = fixture(t);
  assert.throws(
    () => resolveStaticAssetPath(dist, '/assets/../../secret.txt'),
    (error) => error.code === 'FORBIDDEN'
  );
});

test('rejects percent-encoded traversal outside dist', (t) => {
  const { dist } = fixture(t);
  assert.throws(
    () => resolveStaticAssetPath(dist, '/assets/%2e%2e/%2e%2e/secret.txt'),
    (error) => error.code === 'FORBIDDEN'
  );
});

test('rejects malformed URL encoding', (t) => {
  const { dist } = fixture(t);
  assert.throws(
    () => resolveStaticAssetPath(dist, '/assets/%zz'),
    (error) => error.code === 'BAD_REQUEST'
  );
});

test('rejects a symlink that escapes dist', (t) => {
  const { root, dist, assets } = fixture(t);
  const linkPath = path.join(assets, 'leak.txt');

  try {
    fs.symlinkSync(path.join(root, 'secret.txt'), linkPath);
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      t.skip('Symlinks are unavailable in this environment');
      return;
    }
    throw error;
  }

  assert.throws(
    () => resolveStaticAssetPath(dist, '/assets/leak.txt'),
    (error) => error.code === 'FORBIDDEN'
  );
});
