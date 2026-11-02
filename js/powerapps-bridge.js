/** Clés utilisées par la chaîne PowerApps → store → store2 → test → app. */
export const BRIDGE_SESSION_KEY = 'horizon-bridge-payload';
export const BRIDGE_DONE_SESSION_KEY = 'horizon-bridge-done';
export const BRIDGE_PENDING_LOCAL_KEY = 'horizon-bridge-pending';

const BRIDGE_PARAM_NAMES = ['link', 'url', 'lien', 'data', 'page', 'mode', 'target'];

/** Paramètres de requête reconnus comme provenant de PowerApps (lien profond). */
export function hasBridgeQueryParams(search = location.search) {
  if (!search || search.length <= 1) return false;
  const params = new URLSearchParams(search);
  if (params.get('from') === 'store2') return false;
  if (params.get('bridge') === 'skip') return false;
  return BRIDGE_PARAM_NAMES.some(name => params.has(name));
}

/** Lit la query et produit un objet sérialisable pour les étapes suivantes. */
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

/**
 * Résout la destination finale (chemin relatif au site, ex. index.html?mode=minuteur).
 */
export function resolveBridgeTarget(payload) {
  const params = payload?.raw ?? {};
  const explicit = payload?.link ?? params.page ?? params.target ?? null;
  if (explicit) {
    const trimmed = String(explicit).trim();
    if (trimmed.includes('://')) {
      try {
        const absolute = new URL(trimmed);
        const siteRoot = new URL('.', location.href);
        if (absolute.origin === siteRoot.origin) {
          const path = absolute.pathname.replace(/^\/+/, '');
          const basePath = siteRoot.pathname.replace(/[^/]*$/, '');
          const relative = path.startsWith(basePath.slice(0, -1))
            ? path.slice(basePath.length - 1)
            : path.split('/').pop();
          return `${relative || 'index.html'}${absolute.search}${absolute.hash}`;
        }
      } catch {
        /* fall through */
      }
    }
    if (trimmed.startsWith('/') || /^[\w.-]+\.html/.test(trimmed) || trimmed.includes('.html')) {
      return trimmed.replace(/^\//, '');
    }
  }

  if (params.mode) {
    const mode = encodeURIComponent(params.mode);
    return `index.html?bridge=skip&mode=${mode}`;
  }

  return 'index.html?bridge=skip';
}
