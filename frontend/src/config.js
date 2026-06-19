const DEFAULT_API_URL = "http://127.0.0.1:8000";

export const API_URL = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

export function getWebSocketUrl(path) {
  const wsBase = API_URL.replace(/^https:\/\//i, "wss://").replace(/^http:\/\//i, "ws://");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${wsBase}${normalizedPath}`;
}

export function logAppConfig() {
  const viteApiUrl = import.meta.env.VITE_API_URL;

  console.info("[GameDash] Boot", {
    mode: import.meta.env.MODE,
    page: window.location.href,
    apiUrl: API_URL,
    viteApiUrlConfigured: Boolean(viteApiUrl),
    viteApiUrl: viteApiUrl || null,
  });

  if (import.meta.env.PROD && !viteApiUrl) {
    console.warn(
      "[GameDash] VITE_API_URL absent au build — les appels API ciblent localhost:",
      API_URL
    );
  }
}

export function logError(context, error, extra = {}) {
  console.error(`[GameDash] ${context}`, {
    message: error?.message || String(error),
    ...extra,
  });
}

export async function fetchWithLog(url, options = {}, context = "API") {
  const method = options.method || "GET";

  console.info(`[GameDash] → ${method} ${url}`, { context });

  try {
    const response = await fetch(url, options);
    console.info(`[GameDash] ← ${method} ${url}`, {
      context,
      status: response.status,
      ok: response.ok,
    });
    return response;
  } catch (error) {
    logError(`${context} network error`, error, { method, url, apiUrl: API_URL });
    throw error;
  }
}
