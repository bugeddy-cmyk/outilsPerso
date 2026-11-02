/** Pont PowerApps : Test_JEC_JM (store) → NewItem (programme Maurice). */
export const BRIDGE_SESSION_KEY = 'horizon-bridge-payload';
export const BRIDGE_DONE_SESSION_KEY = 'horizon-bridge-done';
export const BRIDGE_PENDING_LOCAL_KEY = 'horizon-bridge-pending';
export const MAURICE_ACCESS_SESSION_KEY = 'horizon-maurice-access';

export const TEST_JEC_JM_DIR = 'Test_JEC_JM';
export const NEW_ITEM_DIR = 'NewItem';

export const MAURICE_APP_PATH = `${NEW_ITEM_DIR}/programme-maurice.html`;
export const TEST_JEC_INDEX_PATH = `${TEST_JEC_JM_DIR}/index.html`;
export const TEST_JEC_STORE_PATH = `${TEST_JEC_JM_DIR}/store.html`;
export const TEST_JEC_BRIDGE_PATH = `${TEST_JEC_JM_DIR}/bridge.html`;

const LEGACY_TARGET_ALIASES = {
  'test.html': MAURICE_APP_PATH,
  'convertisseur-pression-ios-corrige.html': MAURICE_APP_PATH,
  'programme-maurice.html': MAURICE_APP_PATH,
  '_p/programme-maurice.html': MAURICE_APP_PATH,
  '_p/test.html': MAURICE_APP_PATH,
  'store.html': TEST_JEC_STORE_PATH,
  'store2.html': `${TEST_JEC_JM_DIR}/store2.html`,
};

const BRIDGE_PARAM_NAMES = ['link', 'url', 'lien', 'data', 'page', 'mode', 'target'];

export function hasBridgeQueryParams(search = location.search) {
  if (!search || search.length <= 1) return false;
  const params = new URLSearchParams(search);
  if (params.get('from') === 'store2') return false;
  if (params.get('bridge') === 'skip') return false;
  return BRIDGE_PARAM_NAMES.some(name => params.has(name));
}

export function parseIncomingLink(search = location.search) {
  const params = new URLSearchParams(search);
  const link = params.get('link') ?? params.get('url') ?? params.get('lien') ?? params.get('page') ?? null;
  const raw = {};
  params.forEach((value, key) => {
    raw[key] = value;
  });
  return { link, raw, capturedAt: Date.now() };
}

export function readSessionPayload() {
  try {
    const raw = sessionStorage.getItem(BRIDGE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSessionPayload(payload) {
  sessionStorage.setItem(BRIDGE_SESSION_KEY, JSON.stringify(payload));
}

export function markBridgeDoneInSession() {
  sessionStorage.setItem(BRIDGE_DONE_SESSION_KEY, '1');
}

export function promotePayloadToLocal(payload) {
  if (payload) {
    localStorage.setItem(BRIDGE_PENDING_LOCAL_KEY, JSON.stringify(payload));
  }
  markBridgeDoneInSession();
  try {
    sessionStorage.removeItem(BRIDGE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function readPendingLocalPayload() {
  try {
    const raw = localStorage.getItem(BRIDGE_PENDING_LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingLocalPayload() {
  localStorage.removeItem(BRIDGE_PENDING_LOCAL_KEY);
}

export function markMauriceAccessGranted() {
  sessionStorage.setItem(MAURICE_ACCESS_SESSION_KEY, '1');
}

export function hasMauriceAccess() {
  return sessionStorage.getItem(MAURICE_ACCESS_SESSION_KEY) === '1'
    || sessionStorage.getItem(BRIDGE_DONE_SESSION_KEY) === '1';
}

export function normalizeBridgeTarget(relativePath) {
  const path = String(relativePath || '').replace(/^\//, '').split('?')[0];
  const query = String(relativePath || '').includes('?')
    ? relativePath.slice(relativePath.indexOf('?'))
    : '';
  const mapped = LEGACY_TARGET_ALIASES[path] ?? relativePath;
  if (mapped === relativePath) return relativePath;
  if (query && !String(mapped).includes('?')) return mapped + query;
  return mapped;
}

/** Destination relative à la racine du site (outilsPerso/). */
export function resolveBridgeTarget(payload) {
  const params = payload?.raw ?? {};
  const explicit = payload?.link ?? params.page ?? params.target ?? null;
  if (explicit) {
    const trimmed = String(explicit).trim();
    if (trimmed.includes('://')) {
      try {
        const absolute = new URL(trimmed);
        const siteRoot = new URL('/', location.href);
        if (absolute.origin === siteRoot.origin) {
          const sitePath = siteRoot.pathname.replace(/\/$/, '');
          let pathname = absolute.pathname;
          if (sitePath && pathname.startsWith(sitePath)) {
            pathname = pathname.slice(sitePath.length).replace(/^\//, '');
          } else {
            pathname = pathname.replace(/^\//, '');
          }
          const resolved = `${pathname || 'index.html'}${absolute.search}${absolute.hash}`;
          return normalizeBridgeTarget(resolved);
        }
      } catch {
        /* fall through */
      }
    }
    if (trimmed.startsWith('/') || /^[\w./-]+\.html/.test(trimmed) || trimmed.includes('.html')) {
      return normalizeBridgeTarget(trimmed.replace(/^\//, ''));
    }
  }

  if (params.mode) {
    const mode = encodeURIComponent(params.mode);
    return `index.html?bridge=skip&mode=${mode}`;
  }

  return `${MAURICE_APP_PATH}?bridge=skip`;
}
