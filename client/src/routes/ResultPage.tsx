/**
 * ResultPage component.
 *
 * Distinctive, animated quiz result screen.
 * - Animated count-up of final score, accuracy %, and duration
 * - Score tier classification and curriculum context
 * - Action buttons to jump directly to personal analytics or take another quiz
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { apiClient } from '@/api/client'
import { useSessionStore } from '@/store/sessionStore'

interface QuizResultData {
  quiz_id: string
  score: number
  total_questions: number
  accuracy_pct: number
  total_time_taken_ms: number
  exam_name: string
  subject_name: string
  chapter_name: string
}

// ── Number count-up animation hook ───────────────────────────────────────────
function useCountUp(target: number, durationMs: number = 1200, decimals: number = 0): string {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let startTimestamp: number | null = null
    let animationFrameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1)
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setValue(target * easeOut)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        setValue(target)
      }
    }

    animationFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameId)
  }, [target, durationMs])

  return decimals === 0 ? Math.round(value).toString() : value.toFixed(decimals)
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

function getPerformanceTier(accuracyPct: number): { label: string; color: string; icon: string } {
  if (accuracyPct >= 85) return { label: 'Exceptional Mastery', color: 'text-cyan-400', icon: '🏆' }
  if (accuracyPct >= 70) return { label: 'Strong Proficiency', color: 'text-emerald-400', icon: '⚡' }
  if (accuracyPct >= 50) return { label: 'Competent Foundation', color: 'text-amber-400', icon: '📈' }
  return { label: 'Needs Reinforcement', color: 'text-rose-400', icon: '🎯' }
}

export default function ResultPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useSessionStore()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const {
    data: result,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<QuizResultData>({
    queryKey: ['quiz-result', quizId],
    queryFn: () => apiClient.get<QuizResultData>(`/api/quizzes/${quizId}/result`),
    enabled: isAuthenticated && Boolean(quizId),
  })

  // Count-up hooks for metrics
  const animatedScore = useCountUp(result?.score ?? 0, 1200, 0)
  const animatedAccuracy = useCountUp(result?.accuracy_pct ?? 0, 1400, 1)

  const tier = getPerformanceTier(result?.accuracy_pct ?? 0)
  const avgTimePerQuestion = result
    ? (result.total_time_taken_ms / Math.max(result.total_questions, 1) / 1000).toFixed(1)
    : '0.0'

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-lg flex flex-col bg-ink-900/90 border border-ink-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-ink-700/80 bg-ink-900 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-semibold block">
              Quiz Completed
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-ink-100">
              Performance Summary
            </h1>
          </div>
          <div className="h-10 w-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-xl">
            {tier.icon}
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div className="p-5 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="space-y-4 py-8 animate-pulse">
              <div className="h-32 rounded-2xl bg-ink-800/60" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-24 rounded-xl bg-ink-800/40" />
                <div className="h-24 rounded-xl bg-ink-800/40" />
              </div>
            </div>
          ) : isError || !result ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-danger/15 text-danger flex items-center justify-center mb-3 text-lg">
                ⚠️
              </div>
              <p className="text-sm font-semibold text-ink-200">Unable to load result</p>
              <p className="text-xs text-ink-400 mt-1">
                {error instanceof Error ? error.message : 'Result not ready or quiz not found'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 rounded-xl bg-accent text-ink-950 text-xs font-bold shadow-glow"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Context Tag Breadcrumb */}
              <div className="flex items-center gap-1.5 text-xs text-ink-400 font-mono bg-ink-800/60 px-3 py-2 rounded-xl border border-ink-700/50">
                <span className="text-ink-300 font-semibold">{result.exam_name}</span>
                <span>›</span>
                <span>{result.subject_name}</span>
                <span>›</span>
                <span className="text-accent truncate">{result.chapter_name}</span>
              </div>

              {/* Hero Score Showcase Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-ink-800/90 to-ink-850 p-6 border border-ink-700/80 shadow-glow text-center"
              >
                <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
                <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />

                <span className={`inline-block text-xs font-mono font-bold tracking-wider uppercase mb-2 ${tier.color}`}>
                  {tier.label}
                </span>

                {/* Score Count-up */}
                <div className="flex items-baseline justify-center gap-2">
                  <span className="font-display text-6xl sm:text-7xl font-bold tracking-tight text-white">
                    {animatedScore}
                  </span>
                  <span className="font-display text-2xl sm:text-3xl text-ink-400 font-normal">
                    / {result.total_questions}
                  </span>
                </div>

                <p className="text-xs text-ink-400 mt-2">
                  {result.score} out of {result.total_questions} questions answered correctly
                </p>
              </motion.div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* Accuracy Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="rounded-xl bg-ink-800/70 p-4 border border-ink-700/60 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-xs text-ink-400">
                    <span>Accuracy</span>
                    <span className="text-sm">🎯</span>
                  </div>
                  <div className="mt-3">
                    <span className="font-mono text-2xl sm:text-3xl font-bold text-accent">
                      {animatedAccuracy}%
                    </span>
                    <div className="w-full bg-ink-700 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-accent h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(result.accuracy_pct, 100)}%` }}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Total Time Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="rounded-xl bg-ink-800/70 p-4 border border-ink-700/60 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-xs text-ink-400">
                    <span>Total Time</span>
                    <span className="text-sm">⏱️</span>
                  </div>
                  <div className="mt-3">
                    <span className="font-mono text-2xl sm:text-3xl font-bold text-ink-100">
                      {formatDuration(result.total_time_taken_ms)}
                    </span>
                    <p className="text-[11px] text-ink-400 font-mono mt-1">
                      ~{avgTimePerQuestion}s / question
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* ── Action Buttons ───────────────────────────────────────── */}
              <div className="space-y-3 pt-2">
                {/* View Personal Analytics CTA */}
                <Link
                  to={user ? `/analytics?user_id=${user.id}` : '/analytics'}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-ink-950 py-3.5 px-4 font-sans font-bold text-sm shadow-glow hover:opacity-95 transition-opacity"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span>View Personal Analytics & Fatigue →</span>
                </Link>

                {/* Take Another Quiz */}
                <button
                  onClick={() => navigate('/exams')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-ink-800 text-ink-200 hover:text-white hover:bg-ink-750 py-3 px-4 font-sans font-medium text-xs border border-ink-700/70 transition-colors"
                >
                  <span>Choose Another Topic</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
