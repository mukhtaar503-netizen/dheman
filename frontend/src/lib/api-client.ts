const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

const ACCESS_TOKEN_KEY = 'sms_access_token';
const REFRESH_TOKEN_KEY = 'sms_refresh_token';

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Refresh tokens are single-use (rotated server-side on every /auth/refresh call), so if
// several requests hit a 401 at once (e.g. multiple widgets fetching in parallel right as the
// access token expires), each one calling refreshAccessToken independently would race: the
// first call rotates the stored token, and every other concurrent call would then present the
// now-revoked token and get "Invalid or expired refresh token" — forcing an unwanted logout even
// though the session is fine. Sharing one in-flight refresh call across concurrent callers
// eliminates both the race and the duplicate network requests.
let inFlightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = doRefreshAccessToken().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

async function doRefreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken as string;
}

/** Thin fetch wrapper: attaches the bearer token and transparently retries once after a token refresh on 401. */
export async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const accessToken = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch<T>(path, options, false);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText, body.details);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Fetches a binary response (e.g. a PDF) as a Blob, reusing the same auth/refresh handling as apiFetch. */
export async function apiFetchBlob(path: string, retry = true): Promise<Blob> {
  const accessToken = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });

  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetchBlob(path, false);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText, body.details);
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
