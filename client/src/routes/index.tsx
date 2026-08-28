/**
 * Application router definition.
 *
 * All routes are declared here in one place so the full URL structure of the
 * app is visible at a glance.
 */

import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// Eager imports for primary flow screens
import LoginPage from '@/routes/LoginPage'
import ExamListPage from '@/routes/ExamListPage'
import SubjectListPage from '@/routes/SubjectListPage'
import ChapterListPage from '@/routes/ChapterListPage'
import QuizPage from '@/routes/QuizPage'
import ResultPage from '@/routes/ResultPage'

import { AppShell } from '@/components/layout/AppShell'

// ── Loading fallback ──────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-ink-700 border-t-accent" />
    </div>
  )
}

// ── Root layout ───────────────────────────────────────────────────────────────
// Wraps all routes with the AppShell (TopBar + responsive main container).

function RootLayout() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AppShell />
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
        element: <LoginPage />,
      },
      {
        path: '/exams',
        element: <ExamListPage />,
      },
      {
        path: '/exams/:examId/subjects',
        element: <SubjectListPage />,
      },
      {
        path: '/subjects/:subjectId/chapters',
        element: <ChapterListPage />,
      },
      {
        path: '/quiz/:quizId',
        element: <QuizPage />,
      },
      {
        path: '/quiz/:quizId/result',
        element: <ResultPage />,
      },
      // Subsequent phase routes:
      // { path: '/analytics', element: <AnalyticsPage /> },
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
