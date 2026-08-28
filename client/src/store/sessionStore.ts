/**
 * Zustand session/user store.
 *
 * Why Zustand for session state (not TanStack Query)?
 *   TanStack Query is the right tool for server state — data that lives on the
 *   server and needs caching, invalidation, and background refetching.
 *   Session state (who is logged in, what token do we hold) is purely
 *   client-side state that persists across navigations and page reloads but
 *   is not fetched from the server on every render.  Zustand is the right
 *   tool for this: it's lightweight, synchronous, and subscribable from
 *   anywhere in the tree without a Provider.
 *
 * Persistence strategy:
 *   The token is persisted to localStorage via Zustand's `persist` middleware
 *   so the session survives a page refresh.  Only the token and basic user
 *   info are persisted — nothing sensitive beyond what the token already is.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionUser {
  /** MongoDB ObjectId string */
  id: string
  name: string
}

interface SessionState {
  /** The logged-in user, or null if not authenticated. */
  user: SessionUser | null

  /** JWT token returned by POST /api/auth/login, or null if not logged in. */
  token: string | null

  /** Set the session after a successful login. */
  login: (user: SessionUser, token: string) => void

  /** Clear the session (logout). */
  logout: () => void

  /** Whether the user is currently authenticated. */
  isAuthenticated: boolean
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'quizchat-session', // localStorage key
      // Only persist user and token — isAuthenticated is derived on hydration.
      partialize: (state) => ({ user: state.user, token: state.token }),
      // Re-derive isAuthenticated when the store is rehydrated from localStorage.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = state.token !== null
        }
      },
    },
  ),
)
