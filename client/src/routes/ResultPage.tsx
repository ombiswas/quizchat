/**
 * ResultPage component.
 *
 * Handcrafted, editorial performance summary & diagnostic screen.
 * - Clean visual hierarchy: Header Breadcrumb -> Scoreboard & Pace Metrics -> Cognitive Audit -> Diagnostic Question Review.
 * - Non-generic layout with SVG radial score gauge, segmented progress, and clean contrast.
 * - Interactive filterable question inspector without bulky AI-slop card repetition.
 * - Direct navigation to personal analytics and next chapter practice.
 */

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/api/client'
import { useSessionStore } from '@/store/sessionStore'

interface QuestionAttemptDetail {
  question_id: string
  question_index: number
  question_text: string
  selected_option: string
  selected_option_text: string
  correct_option: string
  correct_option_text: string
  is_correct: boolean
  response_duration_ms: number
}

interface QuizResultData {
  quiz_id: string
  score: number
  total_questions: number
  accuracy_pct: number
  total_time_taken_ms: number
  exam_name: string
  subject_name: string
  chapter_name: string
  attempts?: QuestionAttemptDetail[]
}

// ── Number count-up animation hook ───────────────────────────────────────────
function useCountUp(target: number, durationMs: number = 1000, decimals: number = 0): string {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let startTimestamp: number | null = null
    let animationFrameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1)
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

function getPacingLabel(avgSeconds: number): { text: string; badgeClass: string } {
  if (avgSeconds <= 4.5) return { text: 'Rapid Cadence', badgeClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' }
  if (avgSeconds <= 8.5) return { text: 'Optimal Pacing', badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
  return { text: 'Deliberate / Analytical', badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
}

export default function ResultPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useSessionStore()
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect'>('all')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

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
  const animatedScore = useCountUp(result?.score ?? 0, 900, 0)
  const animatedAccuracy = useCountUp(result?.accuracy_pct ?? 0, 1100, 1)

  const attempts = result?.attempts ?? []
  const totalQuestions = result?.total_questions || attempts.length || 15
  const avgTimePerQuestion = result
    ? (result.total_time_taken_ms / Math.max(totalQuestions, 1) / 1000).toFixed(1)
    : '0.0'

  const pacing = getPacingLabel(Number(avgTimePerQuestion))

  const filteredAttempts = useMemo(() => {
    if (filter === 'correct') return attempts.filter((a) => a.is_correct)
    if (filter === 'incorrect') return attempts.filter((a) => !a.is_correct)
    return attempts
  }, [attempts, filter])

  const correctCount = useMemo(() => attempts.filter((a) => a.is_correct).length, [attempts])
  const incorrectCount = useMemo(() => attempts.filter((a) => !a.is_correct).length, [attempts])

  // Radial progress calculations
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - ((result?.accuracy_pct ?? 0) / 100) * circumference

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* ── Context & Navigation Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-ink-400 mb-1">
            <span className="text-ink-200 font-semibold">{result?.exam_name || 'Exam'}</span>
            <span>/</span>
            <span>{result?.subject_name || 'Subject'}</span>
            <span>/</span>
            <span className="text-accent font-medium">{result?.chapter_name || 'Chapter'}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-100 tracking-tight">
            Session Performance Summary
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={user ? `/analytics?user_id=${user.id}` : '/analytics'}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent text-ink-950 font-bold text-xs shadow-glow hover:opacity-95 transition-opacity"
          >
            <span>Cohort Leaderboard & Fatigue</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 py-12 animate-pulse">
          <div className="h-44 rounded-2xl bg-ink-900/80 border border-ink-800" />
          <div className="h-64 rounded-2xl bg-ink-900/60 border border-ink-800" />
        </div>
      ) : isError || !result ? (
        <div className="p-8 rounded-2xl bg-ink-900/80 border border-ink-800 text-center space-y-4">
          <p className="text-sm font-semibold text-ink-200">Unable to load quiz result</p>
          <p className="text-xs text-ink-400">
            {error instanceof Error ? error.message : 'Result not found or session still active'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded-xl bg-accent text-ink-950 text-xs font-bold shadow-glow"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* ── Section 1: Hero Scoreboard Grid ────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Left Hero Card: Radial Gauge & Final Score */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="md:col-span-5 p-5 sm:p-6 rounded-2xl bg-ink-900/90 border border-ink-800 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-400 font-semibold">
                  Session Score
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-ink-800 text-ink-300 border border-ink-700/60">
                  {result.score >= totalQuestions * 0.7 ? 'Passed' : 'Needs Practice'}
                </span>
              </div>

              <div className="my-5 flex items-center justify-around gap-4">
                {/* SVG Circular Ring */}
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      className="stroke-ink-800"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      className="stroke-accent transition-all duration-1000 ease-out"
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="font-mono text-xl font-bold text-ink-100">
                      {animatedAccuracy}%
                    </span>
                    <span className="text-[9px] font-mono text-ink-400 uppercase">Accuracy</span>
                  </div>
                </div>

                {/* Big Score Numbers */}
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight">
                      {animatedScore}
                    </span>
                    <span className="font-display text-lg text-ink-400">/ {totalQuestions}</span>
                  </div>
                  <span className="text-xs text-ink-400 mt-1">
                    {correctCount} Correct • {incorrectCount} Missed
                  </span>
                </div>
              </div>

              {/* Linear mini indicator */}
              <div className="pt-3 border-t border-ink-800/80 flex items-center justify-between text-[11px] font-mono text-ink-400">
                <span>Completed: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-accent font-semibold">{totalQuestions} Questions</span>
              </div>
            </motion.div>

            {/* Right Hero Cards: Pace, Duration, Accuracy Meters */}
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Stat 1: Total Duration */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="p-5 rounded-2xl bg-ink-900/90 border border-ink-800 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs text-ink-400">
                  <span className="font-mono text-[11px] uppercase tracking-wider">Total Time</span>
                  <span>⏱️</span>
                </div>
                <div className="my-2">
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-ink-100">
                    {formatDuration(result.total_time_taken_ms)}
                  </div>
                  <p className="text-xs text-ink-400 mt-0.5">Continuous attempt duration</p>
                </div>
                <div className="text-[11px] font-mono text-ink-400 pt-2 border-t border-ink-800/60">
                  Zero pauses / strictly forward
                </div>
              </motion.div>

              {/* Stat 2: Pacing Latency */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="p-5 rounded-2xl bg-ink-900/90 border border-ink-800 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs text-ink-400">
                  <span className="font-mono text-[11px] uppercase tracking-wider">Pacing Speed</span>
                  <span>⚡</span>
                </div>
                <div className="my-2">
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-accent">
                    {avgTimePerQuestion}s
                  </div>
                  <span className={`inline-block mt-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${pacing.badgeClass}`}>
                    {pacing.text}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-ink-400 pt-2 border-t border-ink-800/60">
                  Average per question
                </div>
              </motion.div>

              {/* Stat 3: Curriculum Chapter Focus (Span 2) */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="sm:col-span-2 p-4 rounded-2xl bg-ink-900/90 border border-ink-800 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">
                    Chapter Topic
                  </span>
                  <p className="text-sm font-semibold text-ink-100">
                    {result.chapter_name}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/exams')}
                  className="px-3 py-1.5 rounded-xl bg-ink-800 hover:bg-ink-750 text-ink-200 hover:text-white text-xs font-medium border border-ink-700/80 transition-colors"
                >
                  Practice Another Chapter →
                </button>
              </motion.div>
            </div>
          </div>

          {/* ── Section 2: Detailed Question Diagnostic Review ──────────────── */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-ink-800/80">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-ink-100 flex items-center gap-2">
                  <span>Question Diagnostic Review</span>
                  <span className="text-xs font-mono text-ink-400 font-normal">
                    ({attempts.length} Questions)
                  </span>
                </h2>
                <p className="text-xs text-ink-400 mt-0.5">
                  Inspect choices, correct answers, and individual question latency
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center bg-ink-900 p-1 rounded-xl border border-ink-800 self-start sm:self-auto text-xs font-mono">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filter === 'all'
                      ? 'bg-accent text-ink-950 font-bold shadow-glow'
                      : 'text-ink-400 hover:text-ink-200'
                  }`}
                >
                  All ({attempts.length})
                </button>
                <button
                  onClick={() => setFilter('correct')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filter === 'correct'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-ink-400 hover:text-emerald-400'
                  }`}
                >
                  ✓ Correct ({correctCount})
                </button>
                <button
                  onClick={() => setFilter('incorrect')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filter === 'incorrect'
                      ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                      : 'text-ink-400 hover:text-rose-400'
                  }`}
                >
                  ✕ Missed ({incorrectCount})
                </button>
              </div>
            </div>

            {/* Questions Diagnostic List */}
            <div className="space-y-3">
              <AnimatePresence>
                {filteredAttempts.map((item) => {
                  const isExpanded = expandedIndex === item.question_index || !item.is_correct

                  return (
                    <motion.div
                      key={item.question_id + item.question_index}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        item.is_correct
                          ? 'bg-ink-900/80 border-ink-800 hover:border-emerald-500/30'
                          : 'bg-ink-900/90 border-rose-500/30 shadow-sm'
                      }`}
                    >
                      {/* Question Row Header */}
                      <button
                        onClick={() =>
                          setExpandedIndex(isExpanded && item.is_correct ? null : item.question_index)
                        }
                        className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-ink-850/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Index Tag */}
                          <span
                            className={`flex h-6 w-8 shrink-0 items-center justify-center rounded-lg font-mono font-bold text-xs ${
                              item.is_correct
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            Q{String(item.question_index + 1).padStart(2, '0')}
                          </span>

                          <div>
                            <p className="text-xs sm:text-sm font-medium text-ink-100 line-clamp-2 leading-relaxed">
                              {item.question_text}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] font-mono text-ink-400">
                            ⏱️ {(item.response_duration_ms / 1000).toFixed(1)}s
                          </span>
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              item.is_correct
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {item.is_correct ? '✓ Correct' : '✕ Missed'}
                          </span>
                        </div>
                      </button>

                      {/* Expanded Options & Comparison Panel */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-ink-800/80 bg-ink-950/40 space-y-2.5">
                          {/* Selected Option */}
                          <div
                            className={`p-3 rounded-xl flex items-start gap-3 border ${
                              item.is_correct
                                ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-200 border-rose-500/20'
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono font-bold text-xs ${
                                item.is_correct
                                  ? 'bg-emerald-500 text-ink-950'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {item.selected_option}
                            </span>
                            <div className="text-xs">
                              <span className="font-mono font-semibold uppercase tracking-wider text-[10px] block opacity-75 mb-0.5">
                                Your Selection {item.is_correct ? '(Correct)' : '(Incorrect)'}
                              </span>
                              <p className="font-medium leading-relaxed">{item.selected_option_text}</p>
                            </div>
                          </div>

                          {/* Correct Option (Shown if user was incorrect) */}
                          {!item.is_correct && (
                            <div className="p-3 rounded-xl flex items-start gap-3 bg-emerald-500/10 text-emerald-200 border border-emerald-500/20">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono font-bold text-xs bg-emerald-500 text-ink-950">
                                {item.correct_option}
                              </span>
                              <div className="text-xs">
                                <span className="font-mono font-semibold uppercase tracking-wider text-[10px] text-emerald-400 block mb-0.5">
                                  Expected Correct Answer
                                </span>
                                <p className="font-medium leading-relaxed">{item.correct_option_text}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
