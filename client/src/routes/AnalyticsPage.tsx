/**
 * AnalyticsPage component.
 *
 * Comprehensive analytics dashboard featuring:
 * 1. Learning Velocity Index (LVI) ranked leaderboard with logged-in user highlight.
 * 2. Fatigue Analysis interactive dual-axis Recharts visualization (My vs Overall cohort).
 * 3. Question Difficulty Index sortable ranking with underlying performance dimensions.
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
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-5xl space-y-6">
        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-ink-900/80 p-5 rounded-2xl border border-ink-700/80 backdrop-blur-xl shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-accent">
                Analytical Intelligence
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-100 mt-1">
              Performance & Cognitive Analytics
            </h1>
            <p className="text-xs text-ink-400 mt-0.5">
              Multi-dimensional metrics across velocity, mental stamina, and problem difficulty
            </p>
          </div>

          {/* Navigation Tab Pills */}
          <div className="flex items-center bg-ink-950 p-1.5 rounded-xl border border-ink-700/80 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-accent text-ink-950 shadow-glow font-bold'
                  : 'text-ink-300 hover:text-white hover:bg-ink-800/60'
              }`}
            >
              🚀 Velocity Leaderboard
            </button>
            <button
              onClick={() => setActiveTab('fatigue')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'fatigue'
                  ? 'bg-accent text-ink-950 shadow-glow font-bold'
                  : 'text-ink-300 hover:text-white hover:bg-ink-800/60'
              }`}
            >
              📉 Fatigue Analysis
            </button>
            <button
              onClick={() => setActiveTab('difficulty')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'difficulty'
                  ? 'bg-accent text-ink-950 shadow-glow font-bold'
                  : 'text-ink-300 hover:text-white hover:bg-ink-800/60'
              }`}
            >
              🧩 Question Difficulty
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────── */}
        {/* SECTION 1: LEARNING VELOCITY LEADERBOARD                         */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {activeTab === 'leaderboard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-ink-900/90 rounded-2xl border border-ink-700/80 shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="p-4 sm:p-5 border-b border-ink-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-ink-100 flex items-center gap-2">
                  <span>Learning Velocity Index (LVI) Leaderboard</span>
                  <span className="text-xs font-mono font-normal text-ink-400">
                    ({lviData.length} learners)
                  </span>
                </h2>
                <p className="text-xs text-ink-400 mt-0.5">
                  Formula: 0.5 × Accuracy + 0.3 × Speed (inverted time) + 0.2 × Consistency
                </p>
              </div>

              {/* Search learner in leaderboard */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={leaderboardSearch}
                  onChange={(e) => setLeaderboardSearch(e.target.value)}
                  placeholder="Filter learner name..."
                  className="w-full rounded-xl bg-ink-800/90 border border-ink-700/80 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-400 focus:border-accent focus:outline-none"
                />
                {leaderboardSearch && (
                  <button
                    onClick={() => setLeaderboardSearch('')}
                    className="absolute right-2.5 top-1.5 text-ink-400 text-xs hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-ink-950/80 text-ink-400 font-mono uppercase text-[10px] tracking-wider border-b border-ink-700/80">
                  <tr>
                    <th className="py-3 px-4 w-16">Rank</th>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4 text-right">Accuracy</th>
                    <th className="py-3 px-4 text-right">Avg Time</th>
                    <th className="py-3 px-4 text-right">Consistency</th>
                    <th className="py-3 px-4 text-right font-bold text-accent">LVI Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800/60 font-sans">
                  {isLoadingLVI ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3.5 px-4"><div className="h-4 w-6 bg-ink-700 rounded" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-32 bg-ink-700 rounded" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-700 rounded ml-auto" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-700 rounded ml-auto" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-700 rounded ml-auto" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-14 bg-ink-700 rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : filteredLVI.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-400">
                        No learner records found.
                      </td>
                    </tr>
                  ) : (
                    filteredLVI.map((item, idx) => {
                      const isCurrentUser = user && item.user_id === user.id
                      const rank = idx + 1
                      const rankBadge =
                        rank === 1
                          ? '🥇 #1'
                          : rank === 2
                          ? '🥈 #2'
                          : rank === 3
                          ? '🥉 #3'
                          : `#${rank}`

                      return (
                        <tr
                          key={item.user_id}
                          className={`transition-colors ${
                            isCurrentUser
                              ? 'bg-accent/15 border-l-4 border-l-accent font-semibold'
                              : 'hover:bg-ink-800/50'
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-ink-300">
                            {rankBadge}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-ink-800 border border-ink-700 flex items-center justify-center font-mono text-[11px] font-bold text-accent shrink-0">
                                {item.user_name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[180px] sm:max-w-xs text-ink-100 font-medium">
                                {item.user_name}
                              </span>
                              {isCurrentUser && (
                                <span className="rounded bg-accent text-ink-950 text-[10px] font-bold px-1.5 py-0.2 font-mono">
                                  YOU
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-ink-200">
                            {(item.accuracy * 100).toFixed(1)}%
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-ink-300">
                            {(item.avg_response_time_ms / 1000).toFixed(1)}s
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-ink-300">
                            {item.consistency_score.toFixed(3)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-accent">
                            {item.learning_velocity_index.toFixed(4)}
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
        {/* SECTION 2: FATIGUE ANALYSIS RECHARTS VISUALIZATION               */}
        {/* ───────────────────────────────────────────────────────────────── */}
        {activeTab === 'fatigue' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-ink-900/90 rounded-2xl border border-ink-700/80 shadow-2xl p-5 sm:p-6 space-y-6 backdrop-blur-xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-700/80 pb-4">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-ink-100">
                  Fatigue & Cognitive Drop-off Analysis
                </h2>
                <p className="text-xs text-ink-400 mt-0.5">
                  Track accuracy degradation and response latency progression across question sequence buckets
                </p>
              </div>

              {/* Toggle My vs Overall Cohort */}
              <div className="flex items-center bg-ink-950 p-1 rounded-xl border border-ink-700/80 self-start sm:self-auto">
                <button
                  onClick={() => setFatigueMode('my')}
                  disabled={!user}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    fatigueMode === 'my'
                      ? 'bg-accent text-ink-950 shadow-glow font-bold'
                      : 'text-ink-400 hover:text-white'
                  } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  My Fatigue {user ? `(${user.name})` : ''}
                </button>
                <button
                  onClick={() => setFatigueMode('overall')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    fatigueMode === 'overall'
                      ? 'bg-accent text-ink-950 shadow-glow font-bold'
                      : 'text-ink-400 hover:text-white'
                  }`}
                >
                  Overall Cohort Fatigue
                </button>
              </div>
            </div>

            {/* Recharts Dual-Axis Chart */}
            <div className="h-80 w-full pt-2">
              {isLoadingFatigue ? (
                <div className="h-full w-full flex items-center justify-center bg-ink-950/40 rounded-xl animate-pulse text-xs text-ink-400">
                  Computing bucket aggregations...
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 bg-ink-950/40 rounded-xl">
                  <span className="text-2xl mb-2">📊</span>
                  <p className="text-sm font-semibold text-ink-200">No attempt data available</p>
                  <p className="text-xs text-ink-400 mt-1">Complete a quiz session to view fatigue metrics.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#272b38" vertical={false} />
                    <XAxis
                      dataKey="range"
                      stroke="#8f96b0"
                      tick={{ fill: '#8f96b0', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    {/* Left Y-Axis: Accuracy */}
                    <YAxis
                      yAxisId="left"
                      stroke="#06b6d4"
                      unit="%"
                      domain={[0, 100]}
                      tick={{ fill: '#06b6d4', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    {/* Right Y-Axis: Response Time */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#f59e0b"
                      unit="s"
                      tick={{ fill: '#f59e0b', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#12141a',
                        borderColor: '#2d3243',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                      }}
                      itemStyle={{ color: '#f1f3f9' }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontFamily: 'Manrope' }}
                    />
                    {/* Accuracy Area Fill */}
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="accuracy"
                      name="Accuracy (%)"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#accuracyGrad)"
                    />
                    {/* Response Time Line */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avg_time_sec"
                      name="Avg Duration (sec)"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#f59e0b' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Fatigue Insight Summary Cards */}
            {chartData.length >= 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-ink-950/60 border border-ink-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-ink-400">Accuracy Trend</span>
                    <p className="text-sm font-semibold text-ink-100">
                      {chartData[0].accuracy}% (Start) → {chartData[chartData.length - 1].accuracy}% (End)
                    </p>
                  </div>
                  <span className="text-xl">
                    {chartData[chartData.length - 1].accuracy < chartData[0].accuracy ? '📉' : '📈'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-ink-950/60 border border-ink-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-ink-400">Pacing Latency</span>
                    <p className="text-sm font-semibold text-ink-100">
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-ink-900/90 rounded-2xl border border-ink-700/80 shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="p-4 sm:p-5 border-b border-ink-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold text-ink-100 flex items-center gap-2">
                  <span>Question Difficulty Ranking</span>
                  <span className="text-xs font-mono font-normal text-ink-400">
                    ({difficultyData.length} questions evaluated)
                  </span>
                </h2>
                <p className="text-xs text-ink-400 mt-0.5">
                  Formula: 0.6 × (1 - Norm Accuracy) + 0.4 × Norm Response Time (Hardest first)
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-ink-950/80 text-ink-400 font-mono uppercase text-[10px] tracking-wider border-b border-ink-700/80">
                  <tr>
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4 min-w-[220px]">Question & Topic</th>
                    <th
                      onClick={() => handleDifficultySort('total_attempts')}
                      className="py-3 px-4 text-right cursor-pointer hover:text-white"
                    >
                      Attempts {difficultySortField === 'total_attempts' ? (difficultySortAsc ? '↑' : '↓') : ''}
                    </th>
                    <th
                      onClick={() => handleDifficultySort('accuracy_pct')}
                      className="py-3 px-4 text-right cursor-pointer hover:text-white"
                    >
                      Accuracy {difficultySortField === 'accuracy_pct' ? (difficultySortAsc ? '↑' : '↓') : ''}
                    </th>
                    <th
                      onClick={() => handleDifficultySort('avg_response_time_ms')}
                      className="py-3 px-4 text-right cursor-pointer hover:text-white"
                    >
                      Avg Time {difficultySortField === 'avg_response_time_ms' ? (difficultySortAsc ? '↑' : '↓') : ''}
                    </th>
                    <th
                      onClick={() => handleDifficultySort('difficulty_score')}
                      className="py-3 px-4 text-right cursor-pointer text-accent hover:text-accent-light"
                    >
                      Difficulty {difficultySortField === 'difficulty_score' ? (difficultySortAsc ? '↑' : '↓') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-800/60 font-sans">
                  {isLoadingDifficulty ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3.5 px-4"><div className="h-4 w-4 bg-ink-700 rounded" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-48 bg-ink-700 rounded" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-700 rounded ml-auto" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-700 rounded ml-auto" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-12 bg-ink-700 rounded ml-auto" /></td>
                        <td className="py-3.5 px-4"><div className="h-4 w-14 bg-ink-700 rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : sortedDifficulty.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-ink-400">
                        No question attempt records found.
                      </td>
                    </tr>
                  ) : (
                    sortedDifficulty.map((item, idx) => {
                      const difficultyPercent = Math.round(item.difficulty_score * 100)
                      const isHighDifficulty = item.difficulty_score >= 0.65

                      return (
                        <tr key={item.question_id} className="hover:bg-ink-800/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-ink-400">
                            #{idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
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
                          <td className="py-3.5 px-4 text-right font-mono font-bold">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] ${
                                isHighDifficulty
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                              }`}
                            >
                              {difficultyPercent}% ({item.difficulty_score.toFixed(2)})
                            </span>
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
      </div>
    </div>
  )
}
