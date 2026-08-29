/**
 * AnalyticsPage component.
 *
 * Handcrafted performance & cognitive analytics dashboard.
 * - Container width strictly matched to navbar (max-w-4xl) for uniform layout.
 * - Clean vertical breathing room and dedicated tab navigation.
 * - 1. Learning Velocity Index (LVI) ranked leaderboard with logged-in user highlight.
 * - 2. Fatigue Analysis interactive dual-axis Recharts visualization (My vs Overall cohort).
 * - 3. Question Difficulty Index with full unclamped question statements and structured performance cards.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { apiClient } from '@/api/client'
import { useSessionStore } from '@/store/sessionStore'

// ── Interfaces ────────────────────────────────────────────────────────────────

interface LearningVelocityData {
  user_id: string
  user_name: string
  accuracy: number
  avg_response_time_ms: number
  consistency_score: number
  learning_velocity_index: number
}

interface FatigueBucketData {
  range: string
  accuracy: number
  avg_response_time_ms: number
}

interface QuestionDifficultyData {
  question_id: string
  question_text: string
  chapter: string
  total_attempts: number
  accuracy_pct: number
  avg_response_time_ms: number
  difficulty_score: number
}

type SortField = 'difficulty_score' | 'accuracy_pct' | 'avg_response_time_ms' | 'total_attempts'

export default function AnalyticsPage() {
  const { user } = useSessionStore()

  // State controls
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'fatigue' | 'difficulty'>('leaderboard')
  const [fatigueMode, setFatigueMode] = useState<'my' | 'overall'>('my')
  const [leaderboardSearch, setLeaderboardSearch] = useState('')
  const [difficultySortField, setDifficultySortField] = useState<SortField>('difficulty_score')
  const [difficultySortAsc, setDifficultySortAsc] = useState(false)

  // ── 1. Learning Velocity Index Query ────────────────────────────────────────
  const {
    data: lviData = [],
    isLoading: isLoadingLVI,
  } = useQuery<LearningVelocityData[]>({
    queryKey: ['analytics-lvi'],
    queryFn: () => apiClient.get<LearningVelocityData[]>('/api/analytics/learning-velocity'),
  })

  // ── 2. Fatigue Analysis Query ───────────────────────────────────────────────
  const fatigueUserId = fatigueMode === 'my' && user ? user.id : undefined
  const {
    data: fatigueData = [],
    isLoading: isLoadingFatigue,
  } = useQuery<FatigueBucketData[]>({
    queryKey: ['analytics-fatigue', fatigueUserId],
    queryFn: () => {
      const url = fatigueUserId
        ? `/api/analytics/fatigue?user_id=${fatigueUserId}`
        : '/api/analytics/fatigue'
      return apiClient.get<FatigueBucketData[]>(url)
    },
  })

  // ── 3. Question Difficulty Query ────────────────────────────────────────────
  const {
    data: difficultyData = [],
    isLoading: isLoadingDifficulty,
  } = useQuery<QuestionDifficultyData[]>({
    queryKey: ['analytics-difficulty'],
    queryFn: () => apiClient.get<QuestionDifficultyData[]>('/api/analytics/question-difficulty'),
  })

  // ── Filtered & Sorted Data ──────────────────────────────────────────────────
  const filteredLVI = useMemo(() => {
    const q = leaderboardSearch.toLowerCase().trim()
    if (!q) return lviData
    return lviData.filter((item) => item.user_name.toLowerCase().includes(q))
  }, [lviData, leaderboardSearch])

  const sortedDifficulty = useMemo(() => {
    return [...difficultyData].sort((a, b) => {
      const multiplier = difficultySortAsc ? 1 : -1
      return (a[difficultySortField] - b[difficultySortField]) * multiplier
    })
  }, [difficultyData, difficultySortField, difficultySortAsc])

  // Formatted chart points
  const chartData = useMemo(() => {
    return fatigueData.map((d) => ({
      range: `Q ${d.range}`,
      accuracy: Math.round(d.accuracy * 100),
      avg_time_sec: Number((d.avg_response_time_ms / 1000).toFixed(1)),
    }))
  }, [fatigueData])

  const handleDifficultySort = (field: SortField) => {
    if (difficultySortField === field) {
      setDifficultySortAsc(!difficultySortAsc)
    } else {
      setDifficultySortField(field)
      setDifficultySortAsc(false)
    }
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="space-y-1.5 pb-2">
        <div className="flex items-center gap-2 text-xs font-mono text-ink-400">
          <span className="text-accent font-semibold uppercase tracking-wider">
            Cognitive Diagnostics
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-100 tracking-tight">
          Performance & Analytics
        </h1>
        <p className="text-xs sm:text-sm text-ink-400 max-w-2xl">
          Multi-dimensional analytics measuring learning velocity, cognitive fatigue curves, and question difficulty indexes.
        </p>
      </div>

      {/* ── Segmented Navigation Tabs ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 bg-ink-900/90 p-1.5 rounded-2xl border border-ink-800 shadow-sm backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'leaderboard'
              ? 'bg-accent text-ink-950 font-bold shadow-sm'
              : 'text-ink-300 hover:text-white hover:bg-ink-800/60'
          }`}
        >
          <span>Velocity Leaderboard</span>
        </button>

        <button
          onClick={() => setActiveTab('fatigue')}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'fatigue'
              ? 'bg-accent text-ink-950 font-bold shadow-sm'
              : 'text-ink-300 hover:text-white hover:bg-ink-800/60'
          }`}
        >
          <span>Fatigue Curve</span>
        </button>

        <button
          onClick={() => setActiveTab('difficulty')}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'difficulty'
              ? 'bg-accent text-ink-950 font-bold shadow-sm'
              : 'text-ink-300 hover:text-white hover:bg-ink-800/60'
          }`}
        >
          <span>Question Difficulty</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: LEARNING VELOCITY LEADERBOARD                         */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'leaderboard' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-ink-900/90 rounded-2xl border border-ink-800 shadow-xl overflow-hidden backdrop-blur-xl flex flex-col"
        >
          {/* Section Toolbar */}
          <div className="p-4 sm:p-5 border-b border-ink-800 bg-ink-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="font-display text-base sm:text-lg font-bold text-ink-100">
                Learning Velocity Index (LVI)
              </h2>
              <p className="text-xs text-ink-400">
                Formula: <span className="font-mono text-accent">Accuracy × Speed × Consistency</span>
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs flex items-center">
              <svg
                className="absolute left-3.5 h-4 w-4 text-ink-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={leaderboardSearch}
                onChange={(e) => setLeaderboardSearch(e.target.value)}
                placeholder="Search ranked learners..."
                className="w-full rounded-xl bg-ink-900 border border-ink-700/80 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-ink-100 placeholder-ink-400 focus:border-accent focus:outline-none transition-all font-sans"
              />
              {leaderboardSearch && (
                <button
                  onClick={() => setLeaderboardSearch('')}
                  className="absolute right-3 text-ink-400 hover:text-ink-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-ink-800 bg-ink-950/70 text-ink-400 uppercase font-mono text-[10px] sm:text-[11px] tracking-wider">
                  <th className="py-3.5 px-5 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-5">Learner Profile</th>
                  <th className="py-3.5 px-5 text-right">Accuracy</th>
                  <th className="py-3.5 px-5 text-right">Avg Response</th>
                  <th className="py-3.5 px-5 text-right">Consistency</th>
                  <th className="py-3.5 px-5 text-right">LVI Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/60 font-sans">
                {isLoadingLVI ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-5 text-center"><div className="h-4 w-6 bg-ink-800 rounded mx-auto" /></td>
                      <td className="py-4 px-5"><div className="h-4 w-36 bg-ink-800 rounded" /></td>
                      <td className="py-4 px-5"><div className="h-4 w-12 bg-ink-800 rounded ml-auto" /></td>
                      <td className="py-4 px-5"><div className="h-4 w-12 bg-ink-800 rounded ml-auto" /></td>
                      <td className="py-4 px-5"><div className="h-4 w-12 bg-ink-800 rounded ml-auto" /></td>
                      <td className="py-4 px-5"><div className="h-4 w-14 bg-ink-800 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredLVI.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ink-400">
                      No matching learners found on leaderboard.
                    </td>
                  </tr>
                ) : (
                  filteredLVI.map((item, idx) => {
                    const isCurrentUser = user?.id === item.user_id
                    const rank = idx + 1

                    return (
                      <tr
                        key={item.user_id}
                        className={`transition-colors ${
                          isCurrentUser
                            ? 'bg-accent/10 hover:bg-accent/15 border-l-4 border-accent'
                            : 'hover:bg-ink-850/50'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-5 text-center font-mono font-bold">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
                              #1
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/30 text-xs">
                              #2
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/30 text-xs">
                              #3
                            </span>
                          ) : (
                            <span className="text-ink-400 font-normal">#{rank}</span>
                          )}
                        </td>

                        {/* User Name */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-ink-100">
                              {item.user_name}
                            </span>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent text-ink-950">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Accuracy */}
                        <td className="py-4 px-5 text-right font-mono text-ink-200">
                          {(item.accuracy * 100).toFixed(1)}%
                        </td>

                        {/* Avg Duration */}
                        <td className="py-4 px-5 text-right font-mono text-ink-300">
                          {(item.avg_response_time_ms / 1000).toFixed(2)}s
                        </td>

                        {/* Consistency */}
                        <td className="py-4 px-5 text-right font-mono text-ink-300">
                          {item.consistency_score.toFixed(2)}
                        </td>

                        {/* LVI Metric */}
                        <td className="py-4 px-5 text-right font-mono font-bold text-accent">
                          {item.learning_velocity_index.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: FATIGUE ANALYSIS                                      */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'fatigue' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-ink-900/90 rounded-2xl border border-ink-800 shadow-xl overflow-hidden backdrop-blur-xl p-5 sm:p-7 space-y-6"
        >
          {/* Header & Mode Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink-800">
            <div className="space-y-0.5">
              <h2 className="font-display text-base sm:text-lg font-bold text-ink-100">
                Cognitive Fatigue & Accuracy Progression
              </h2>
              <p className="text-xs text-ink-400">
                Tracking mental stamina and response latency across sequential question intervals (Q1-3 → Q13-15)
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center bg-ink-950 p-1 rounded-xl border border-ink-800 shrink-0 font-mono text-xs">
              <button
                onClick={() => setFatigueMode('my')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  fatigueMode === 'my'
                    ? 'bg-accent text-ink-950 font-bold shadow-sm'
                    : 'text-ink-400 hover:text-white'
                }`}
              >
                My Fatigue Curve
              </button>
              <button
                onClick={() => setFatigueMode('overall')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  fatigueMode === 'overall'
                    ? 'bg-accent text-ink-950 font-bold shadow-sm'
                    : 'text-ink-400 hover:text-white'
                }`}
              >
                Cohort Benchmark
              </button>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="w-full h-80 pt-2">
            {isLoadingFatigue ? (
              <div className="h-full w-full bg-ink-850/50 rounded-xl animate-pulse flex items-center justify-center text-ink-400 text-xs font-mono">
                Loading cognitive curve...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-ink-400 text-xs space-y-1">
                <span className="text-lg">📉</span>
                <span>No attempt records found for this cohort filter.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="range" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    stroke="#06b6d4"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#f59e0b"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 'dataMax + 4']}
                    unit="s"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      borderColor: '#3f3f46',
                      borderRadius: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#f4f4f5',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />

                  {/* Accuracy Area */}
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="accuracy"
                    name="Accuracy (%)"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#accuracyGrad)"
                  />
                  {/* Response Time Line */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avg_time_sec"
                    name="Avg Latency (sec)"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#f59e0b' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Fatigue Insights Strip */}
          {chartData.length >= 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-ink-950/60 border border-ink-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-ink-400">Accuracy Trend</span>
                  <p className="text-sm font-semibold text-ink-100 mt-1">
                    {chartData[0].accuracy}% (Start) → {chartData[chartData.length - 1].accuracy}% (End)
                  </p>
                </div>
                <span className="text-2xl">
                  {chartData[chartData.length - 1].accuracy < chartData[0].accuracy ? '📉' : '📈'}
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-ink-950/60 border border-ink-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-ink-400">Pacing Latency</span>
                  <p className="text-sm font-semibold text-ink-100 mt-1">
                    {chartData[0].avg_time_sec}s → {chartData[chartData.length - 1].avg_time_sec}s per question
                  </p>
                </div>
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: QUESTION DIFFICULTY INDEX (STRUCTURED CARD LIST)      */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'difficulty' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Table / Sort Control Header */}
          <div className="p-4 sm:p-5 bg-ink-900/90 rounded-2xl border border-ink-800 shadow-sm space-y-4">
            {/* Title & Count Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-ink-800/80">
              <div className="space-y-0.5">
                <h2 className="font-display text-base sm:text-lg font-bold text-ink-100">
                  Question Difficulty Ranking
                </h2>
                <p className="text-xs text-ink-400">
                  Ranked by computed cognitive failure rate & student response latency
                </p>
              </div>
              <span className="text-xs font-mono text-ink-400 self-start sm:self-auto">
                {difficultyData.length} Questions Ranked
              </span>
            </div>

            {/* Dedicated Sort Control Row (Below Text) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 font-mono text-xs">
              <span className="text-ink-400 text-xs font-semibold shrink-0">Sort by:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                <button
                  onClick={() => handleDifficultySort('difficulty_score')}
                  className={`py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    difficultySortField === 'difficulty_score'
                      ? 'bg-accent text-ink-950 border-accent font-bold shadow-sm'
                      : 'bg-ink-950 text-ink-300 border-ink-800 hover:text-white hover:border-ink-700'
                  }`}
                >
                  Difficulty {difficultySortField === 'difficulty_score' && (difficultySortAsc ? '↑' : '↓')}
                </button>

                <button
                  onClick={() => handleDifficultySort('accuracy_pct')}
                  className={`py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    difficultySortField === 'accuracy_pct'
                      ? 'bg-accent text-ink-950 border-accent font-bold shadow-sm'
                      : 'bg-ink-950 text-ink-300 border-ink-800 hover:text-white hover:border-ink-700'
                  }`}
                >
                  Accuracy {difficultySortField === 'accuracy_pct' && (difficultySortAsc ? '↑' : '↓')}
                </button>

                <button
                  onClick={() => handleDifficultySort('avg_response_time_ms')}
                  className={`py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    difficultySortField === 'avg_response_time_ms'
                      ? 'bg-accent text-ink-950 border-accent font-bold shadow-sm'
                      : 'bg-ink-950 text-ink-300 border-ink-800 hover:text-white hover:border-ink-700'
                  }`}
                >
                  Avg Time {difficultySortField === 'avg_response_time_ms' && (difficultySortAsc ? '↑' : '↓')}
                </button>

                <button
                  onClick={() => handleDifficultySort('total_attempts')}
                  className={`py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                    difficultySortField === 'total_attempts'
                      ? 'bg-accent text-ink-950 border-accent font-bold shadow-sm'
                      : 'bg-ink-950 text-ink-300 border-ink-800 hover:text-white hover:border-ink-700'
                  }`}
                >
                  Attempts {difficultySortField === 'total_attempts' && (difficultySortAsc ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>

          {/* Structured Question Cards List */}
          <div className="space-y-3">
            {isLoadingDifficulty ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-ink-900/60 border border-ink-800 space-y-3 animate-pulse"
                >
                  <div className="h-4 w-32 bg-ink-800 rounded" />
                  <div className="h-5 w-full bg-ink-800 rounded" />
                  <div className="h-4 w-48 bg-ink-800 rounded" />
                </div>
              ))
            ) : sortedDifficulty.length === 0 ? (
              <div className="p-12 text-center bg-ink-900/60 rounded-2xl border border-ink-800 text-ink-400 text-xs">
                No question records found.
              </div>
            ) : (
              <AnimatePresence>
                {sortedDifficulty.map((item, idx) => (
                  <motion.div
                    key={item.question_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                    className="p-5 sm:p-6 rounded-2xl bg-ink-900/90 border border-ink-800 hover:border-ink-700 transition-all duration-150 space-y-4 shadow-sm"
                  >
                    {/* Top Row: Index Badge, Chapter, and Difficulty Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-ink-400 px-2 py-0.5 rounded bg-ink-950 border border-ink-800">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-mono text-xs text-accent px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25">
                          {item.chapter}
                        </span>
                      </div>

                      {/* Difficulty Status Badge */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold font-mono ${
                          item.difficulty_score >= 0.65
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : item.difficulty_score >= 0.40
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        <span>Score: {item.difficulty_score.toFixed(2)}</span>
                        <span className="text-ink-400 font-normal">/</span>
                        <span>
                          {item.difficulty_score >= 0.65 ? 'Hard Tier' : item.difficulty_score >= 0.40 ? 'Moderate Tier' : 'Easy Tier'}
                        </span>
                      </div>
                    </div>

                    {/* Unclamped Question Text Statement */}
                    <div className="pt-1">
                      <p className="font-sans font-medium text-sm sm:text-base text-ink-100 leading-relaxed">
                        {item.question_text}
                      </p>
                    </div>

                    {/* Bottom Metrics Breakdown Strip */}
                    <div className="pt-3 border-t border-ink-800/80 flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono text-ink-400">
                      <div className="flex items-center gap-1.5">
                        <span className="text-ink-400">Attempts:</span>
                        <span className="font-bold text-ink-200">{item.total_attempts}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-ink-400">Accuracy:</span>
                        <span
                          className={`font-bold ${
                            item.accuracy_pct >= 0.7
                              ? 'text-emerald-400'
                              : item.accuracy_pct >= 0.4
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {(item.accuracy_pct * 100).toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-ink-400">Avg Duration:</span>
                        <span className="font-bold text-ink-200">
                          {(item.avg_response_time_ms / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
