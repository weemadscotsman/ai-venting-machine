'use strict';

const fs = require('fs');
const path = require('path');

function createPathError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isPathInside(basePath, candidatePath) {
  const relative = path.relative(basePath, candidatePath);
  return relative === '' ||
    (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
}

function decodeRequestPath(requestUrl) {
  const queryIndex = requestUrl.indexOf('?');
  const rawPath = queryIndex === -1 ? requestUrl : requestUrl.slice(0, queryIndex);

  try {
    return decodeURIComponent(rawPath);
  } catch {
    throw createPathError('BAD_REQUEST', 'Malformed URL encoding');
  }
}

function resolveStaticAssetPath(distPath, requestUrl) {
  const canonicalBase = fs.realpathSync(distPath);
  const decodedPath = decodeRequestPath(requestUrl);
  const lexicalCandidate = path.resolve(canonicalBase, '.' + decodedPath);

  if (!isPathInside(canonicalBase, lexicalCandidate)) {
    throw createPathError('FORBIDDEN', 'Path escapes static asset root');
  }

  const canonicalCandidate = fs.realpathSync(lexicalCandidate);
  if (!isPathInside(canonicalBase, canonicalCandidate)) {
    throw createPathError('FORBIDDEN', 'Symlink escapes static asset root');
  }

  return canonicalCandidate;
}

module.exports = {
  decodeRequestPath,
  isPathInside,
  resolveStaticAssetPath,
};
