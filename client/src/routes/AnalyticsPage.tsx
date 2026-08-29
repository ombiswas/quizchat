/**
 * AnalyticsPage component.
 *
 * Handcrafted performance & cognitive analytics dashboard.
 * - Container width strictly matched to navbar (max-w-4xl) for uniform layout.
 * - 1. Learning Velocity Index (LVI) ranked leaderboard with logged-in user highlight.
 * - 2. Fatigue Analysis interactive dual-axis Recharts visualization (My vs Overall cohort).
 * - 3. Question Difficulty Index sortable ranking with underlying performance dimensions.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-ink-400 mb-0.5">
            <span>Analytics</span>
            <span>/</span>
            <span className="text-accent font-semibold">Cognitive Diagnostics</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-100 tracking-tight">
            Performance Analytics
          </h1>
          <p className="text-xs sm:text-sm text-ink-400 mt-0.5">
            Velocity metrics, mental fatigue tracking, and question difficulty index.
          </p>
        </div>

        {/* Navigation Tab Pills */}
        <div className="flex items-center bg-ink-900 p-1.5 rounded-xl border border-ink-800 self-start sm:self-auto shrink-0 font-mono text-xs">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-accent text-ink-950 font-bold shadow-glow'
                : 'text-ink-300 hover:text-white'
            }`}
          >
            Velocity Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('fatigue')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'fatigue'
                ? 'bg-accent text-ink-950 font-bold shadow-glow'
                : 'text-ink-300 hover:text-white'
            }`}
          >
            Fatigue Curve
          </button>
          <button
            onClick={() => setActiveTab('difficulty')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'difficulty'
                ? 'bg-accent text-ink-950 font-bold shadow-glow'
                : 'text-ink-300 hover:text-white'
            }`}
          >
            Question Difficulty
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: LEARNING VELOCITY LEADERBOARD                         */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'leaderboard' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-ink-900/90 rounded-2xl border border-ink-800 shadow-xl overflow-hidden backdrop-blur-xl"
        >
          {/* Section Toolbar */}
          <div className="p-4 sm:p-5 border-b border-ink-800 bg-ink-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-ink-100 flex items-center gap-2">
                <span>Learning Velocity Index (LVI)</span>
                <span className="text-xs font-mono font-normal text-ink-400">
                  (Accuracy × Speed × Consistency)
                </span>
              </h2>
              <p className="text-xs text-ink-400 mt-0.5">
                Composite metric rating fast, accurate, and consistent problem solvers
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs flex items-center">
              <svg
                className="absolute left-3.5 h-3.5 w-3.5 text-ink-400 pointer-events-none"
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
                className="w-full rounded-xl bg-ink-900 border border-ink-700/80 pl-9 pr-8 py-2 text-xs text-ink-100 placeholder-ink-400 focus:border-accent focus:outline-none transition-all font-sans"
              />
              {leaderboardSearch && (
                <button
                  onClick={() => setLeaderboardSearch('')}
                  className="absolute right-2.5 text-ink-400 hover:text-ink-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-ink-800 bg-ink-950/70 text-ink-400 uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-14 text-center">Rank</th>
                  <th className="py-3 px-4">Learner</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                  <th className="py-3 px-4 text-right">Avg Response</th>
                  <th className="py-3 px-4 text-right">Consistency</th>
                  <th className="py-3 px-4 text-right">LVI Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/60">
                {isLoadingLVI ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4 text-center"><div className="h-4 w-6 bg-ink-800 rounded mx-auto" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-32 bg-ink-800 rounded" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-800 rounded ml-auto" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-800 rounded ml-auto" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-800 rounded ml-auto" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-14 bg-ink-800 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredLVI.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ink-400 font-sans">
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
                        className={`transition-colors font-sans ${
                          isCurrentUser
                            ? 'bg-accent/10 hover:bg-accent/15 border-l-2 border-accent'
                            : 'hover:bg-ink-850/50'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          {rank === 1 ? (
                            <span className="text-amber-400 font-bold">#1</span>
                          ) : rank === 2 ? (
                            <span className="text-slate-300 font-bold">#2</span>
                          ) : rank === 3 ? (
                            <span className="text-amber-600 font-bold">#3</span>
                          ) : (
                            <span className="text-ink-400 font-normal">#{rank}</span>
                          )}
                        </td>

                        {/* User Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink-100">
                              {item.user_name}
                            </span>
                            {isCurrentUser && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-accent text-ink-950">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Accuracy */}
                        <td className="py-3.5 px-4 text-right font-mono text-ink-200">
                          {(item.accuracy * 100).toFixed(1)}%
                        </td>

                        {/* Avg Duration */}
                        <td className="py-3.5 px-4 text-right font-mono text-ink-300">
                          {(item.avg_response_time_ms / 1000).toFixed(2)}s
                        </td>

                        {/* Consistency */}
                        <td className="py-3.5 px-4 text-right font-mono text-ink-300">
                          {item.consistency_score.toFixed(2)}
                        </td>

                        {/* LVI Metric */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-accent">
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
          className="bg-ink-900/90 rounded-2xl border border-ink-800 shadow-xl overflow-hidden backdrop-blur-xl p-5 sm:p-6 space-y-6"
        >
          {/* Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink-800">
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-ink-100">
                Cognitive Fatigue & Accuracy Progression
              </h2>
              <p className="text-xs text-ink-400 mt-0.5">
                Observe accuracy drops and latency slowdown across sequential question buckets (Q1-3 → Q13-15)
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center bg-ink-950 p-1 rounded-xl border border-ink-800 shrink-0 font-mono text-xs">
              <button
                onClick={() => setFatigueMode('my')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  fatigueMode === 'my'
                    ? 'bg-accent text-ink-950 font-bold shadow-glow'
                    : 'text-ink-400 hover:text-white'
                }`}
              >
                My Fatigue Curve
              </button>
              <button
                onClick={() => setFatigueMode('overall')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  fatigueMode === 'overall'
                    ? 'bg-accent text-ink-950 font-bold shadow-glow'
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-ink-950/60 border border-ink-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">Accuracy Trend</span>
                  <p className="text-sm font-semibold text-ink-100 mt-0.5">
                    {chartData[0].accuracy}% (Start) → {chartData[chartData.length - 1].accuracy}% (End)
                  </p>
                </div>
                <span className="text-xl">
                  {chartData[chartData.length - 1].accuracy < chartData[0].accuracy ? '📉' : '📈'}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-ink-950/60 border border-ink-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-ink-400">Pacing Latency</span>
                  <p className="text-sm font-semibold text-ink-100 mt-0.5">
                    {chartData[0].avg_time_sec}s → {chartData[chartData.length - 1].avg_time_sec}s per question
                  </p>
                </div>
                <span className="text-xl">⏱️</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: QUESTION DIFFICULTY INDEX TABLE                       */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {activeTab === 'difficulty' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-ink-900/90 rounded-2xl border border-ink-800 shadow-xl overflow-hidden backdrop-blur-xl"
        >
          {/* Table Header */}
          <div className="p-4 sm:p-5 border-b border-ink-800 bg-ink-950/50 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-ink-100 flex items-center gap-2">
                <span>Question Difficulty Ranking</span>
                <span className="text-xs font-mono font-normal text-ink-400">
                  (Failure Rate × Response Time Latency)
                </span>
              </h2>
              <p className="text-xs text-ink-400 mt-0.5">
                Sortable database of questions ranked by computed cognitive challenge
              </p>
            </div>

            <span className="text-xs font-mono text-ink-400">
              {difficultyData.length} Questions Ranked
            </span>
          </div>

          {/* Difficulty Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-ink-800 bg-ink-950/70 text-ink-400 uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Question Prompt & Chapter</th>
                  <th
                    onClick={() => handleDifficultySort('total_attempts')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    Attempts {difficultySortField === 'total_attempts' && (difficultySortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleDifficultySort('accuracy_pct')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    Accuracy {difficultySortField === 'accuracy_pct' && (difficultySortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleDifficultySort('avg_response_time_ms')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    Avg Time {difficultySortField === 'avg_response_time_ms' && (difficultySortAsc ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleDifficultySort('difficulty_score')}
                    className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                  >
                    Difficulty Index {difficultySortField === 'difficulty_score' && (difficultySortAsc ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/60">
                {isLoadingDifficulty ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4"><div className="h-4 w-6 bg-ink-800 rounded" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-48 bg-ink-800 rounded" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-800 rounded ml-auto" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-800 rounded ml-auto" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-800 rounded ml-auto" /></td>
                      <td className="py-3.5 px-4"><div className="h-4 w-14 bg-ink-800 rounded ml-auto" /></td>
                    </tr>
                  ))
                ) : sortedDifficulty.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-ink-400">
                      No question attempt records found.
                    </td>
                  </tr>
                ) : (
                  sortedDifficulty.map((item, idx) => (
                    <tr key={item.question_id} className="hover:bg-ink-850/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-ink-400">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4 max-w-sm">
                        <p className="font-medium text-ink-100 line-clamp-2 leading-relaxed">
                          {item.question_text}
                        </p>
                        <span className="inline-block mt-1 font-mono text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                          {item.chapter}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-ink-300">
                        {item.total_attempts}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-ink-200">
                        {(item.accuracy_pct * 100).toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-ink-300">
                        {(item.avg_response_time_ms / 1000).toFixed(1)}s
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold font-mono ${
                            item.difficulty_score >= 0.65
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : item.difficulty_score >= 0.40
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                              item.difficulty_score >= 0.65
                                ? 'bg-rose-400'
                                : item.difficulty_score >= 0.40
                                ? 'bg-amber-400'
                                : 'bg-cyan-400'
                            }`}
                          />
                          <span>{item.difficulty_score.toFixed(2)}</span>
                          <span className="text-[10px] text-ink-400 font-normal">
                            {item.difficulty_score >= 0.65 ? 'Hard' : item.difficulty_score >= 0.40 ? 'Med' : 'Easy'}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  )
}
