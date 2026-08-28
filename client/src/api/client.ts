/**
 * Typed API client — the single place where all HTTP calls originate.
 *
 * Why a custom wrapper instead of raw fetch()?
 *   1. Single base URL: VITE_API_URL is read once here; no other file needs
 *      to know where the backend lives.
 *   2. Consistent error handling: non-2xx responses are always thrown as an
 *      ApiError with the backend's { detail } message extracted, so TanStack
 *      Query's error states are uniformly typed across every query/mutation.
 *   3. Auth header injection: the JWT token is attached automatically from
 *      the Zustand session store, so individual callers don't have to.
 *
 * Usage:
 *   import { apiClient } from '@/api/client'
 *   const users = await apiClient.get<User[]>('/api/users')
 *   const result = await apiClient.post<LoginResponse>('/api/auth/login', { user_id })
 */

import { useSessionStore } from '@/store/sessionStore'

// ── Base URL ─────────────────────────────────────────────────────────────────

/**
 * The backend base URL.  Vite exposes only VITE_-prefixed env vars to the
 * browser bundle, preventing accidental leakage of server secrets.
 * Falls back to localhost so the app works without a .env file locally.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ── Error type ────────────────────────────────────────────────────────────────

/** Structured error thrown for any non-2xx HTTP response. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

/**
 * Internal fetch wrapper.  All public client methods delegate to this.
 *
 * @param path    - URL path, e.g. '/api/users' (must start with '/')
 * @param options - Standard RequestInit options merged with auth header
 * @returns       - Parsed JSON response typed as T
 * @throws        - ApiError for non-2xx responses
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Pull the token out of Zustand without using a React hook (this is
  // a plain async function, not a component), using getState() directly.
  const token = useSessionStore.getState().token

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    // FastAPI returns { detail: string } for all error responses.
    let message = `HTTP ${response.status}`
    try {
      const body = await response.json() as { detail?: string }
      if (body.detail) message = body.detail
    } catch {
      // Body wasn't JSON — keep the status-based message.
    }
    throw new ApiError(response.status, message)
  }

  // 204 No Content — return undefined cast to T (callers should type accordingly)
  if (response.status === 204) {
    return undefined as unknown as T
  }

  return response.json() as Promise<T>
}

// ── Public client ─────────────────────────────────────────────────────────────

export const apiClient = {
  /** GET request. */
  get<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'GET' })
  },

  /** POST request with a JSON body. */
  post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },

  /** PUT request with a JSON body. */
  put<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  },

  /** DELETE request. */
  delete<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>(path, { ...options, method: 'DELETE' })
  },
}
