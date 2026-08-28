/**
 * Application router definition.
 *
 * All routes are declared here in one place so the full URL structure of the
 * app is visible at a glance.  Route components are lazy-loaded with React.lazy
 * to keep the initial bundle small — each screen only loads when navigated to.
 *
 * Route map (filled in as phases are built):
 *   /                → LoginPage        (Phase 5-P2)
 *   /exams           → ExamListPage     (Phase 5-P3)
 *   /exams/:examId/subjects → SubjectListPage (Phase 5-P3)
 *   /subjects/:subjectId/chapters → ChapterListPage (Phase 5-P3)
 *   /quiz/:quizId    → QuizPage         (Phase 5-P4)
 *   /quiz/:quizId/result → ResultPage   (Phase 5-P5)
 *   /analytics       → AnalyticsPage    (Phase 5-P6)
 *
 * For now, only the placeholder "/" route is wired.
 */

import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'

// Eager import for the placeholder — it's tiny and always the first load.
import HomePage from '@/routes/HomePage'

// ── Loading fallback ──────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-ink-700 border-t-accent" />
    </div>
  )
}

// ── Root layout ───────────────────────────────────────────────────────────────
// Wraps all routes.  Navigation bar, auth guards etc. will live here in Phase 5.

function RootLayout() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      // Routes added here incrementally in Phase 5:
      // { path: '/exams', element: <ExamListPage /> },
      // ...
    ],
  },
])

// ── Provider component ────────────────────────────────────────────────────────

/**
 * Wrap the app with the router provider.
 * Exported as a component so main.tsx stays clean.
 */
export function AppRouter() {
  return <RouterProvider router={router} />
}
