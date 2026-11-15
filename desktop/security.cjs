const path = require('node:path');

const APP_URL = 'sctg://app/index.html';
const CONTENT_SECURITY_POLICY = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";

function isAppDocument(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'sctg:' && url.host === 'app' && !url.username && !url.password
      && url.pathname === '/index.html';
  } catch {
    return false;
  }
}

// Only expose the built UI, never package.json, desktop code or arbitrary files.
function resolveAsset(distDirectory, value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'sctg:' || url.host !== 'app' || url.username || url.password) return null;
    const name = decodeURIComponent(url.pathname).slice(1);
    if (name !== 'index.html' && !/^assets\/[a-zA-Z0-9_.-]+\.(js|css|woff2?|png|svg)$/.test(name)) return null;
    return path.join(distDirectory, name);
  } catch {
    return null;
  }
}

module.exports = { APP_URL, CONTENT_SECURITY_POLICY, isAppDocument, resolveAsset };
