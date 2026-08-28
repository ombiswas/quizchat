/**
 * Application entry point.
 *
 * This file wires together all the global providers in the correct order:
 *
 *   QueryClientProvider  — TanStack Query server-state cache
 *     └─ AppRouter       — react-router-dom routing
 *         └─ (screens)   — individual route components
 *
 * Why TanStack Query is outside the router:
 *   The query cache should live at the outermost level so it persists across
 *   route navigations.  If it were inside a route component, navigating away
 *   would destroy the cache and refetch everything on return.
 *
 * Zustand (sessionStore) needs no Provider — it's accessed directly from any
 * component via the useSessionStore hook.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { AppRouter } from '@/routes'
import './index.css'

// ── TanStack Query client ─────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 2 minutes before background refetch.
      // Most quiz data (exams/subjects/chapters) is stable; results and
      // analytics may need shorter staleTime — override per-query as needed.
      staleTime: 2 * 60 * 1000,

      // Retry once on failure before surfacing an error to the UI.
      // Keeps the UX snappy for genuine server errors (no 3× delay).
      retry: 1,

      // Don't refetch when the window regains focus — quiz sessions
      // shouldn't silently reload while a user is mid-answer.
      refetchOnWindowFocus: false,
    },
  },
})

// ── Render ────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      {/* DevTools only included in development builds — tree-shaken in production */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
