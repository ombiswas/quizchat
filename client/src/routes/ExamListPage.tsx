/**
 * ExamListPage component.
 *
 * Visual style matches the chat contact list:
 * - Top search filter
 * - High-contrast exam rows with custom iconography and badge counts
 * - Smooth drill-down navigation to /exams/:examId/subjects
 */

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/api/client'
import { useSessionStore } from '@/store/sessionStore'

interface ExamItem {
  id: string
  name: string
}

export default function ExamListPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useSessionStore()
  const [searchQuery, setSearchQuery] = useState('')

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const {
    data: exams = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ExamItem[]>({
    queryKey: ['exams'],
    queryFn: () => apiClient.get<ExamItem[]>('/api/exams'),
    enabled: isAuthenticated,
  })

  const filteredExams = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return exams
    return exams.filter((e) => e.name.toLowerCase().includes(q))
  }, [exams, searchQuery])

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-lg flex flex-col h-[calc(100vh-6.5rem)] max-h-[820px] bg-ink-900/90 border border-ink-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-ink-700/80 bg-ink-900 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-ink-100">
                Select Exam
              </h1>
              <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-mono font-semibold text-accent border border-accent/30">
                {exams.length} tracks
              </span>
            </div>
            <p className="text-xs text-ink-400 mt-0.5">
              Choose your competitive examination target
            </p>
          </div>
        </div>

        {/* ── Search Bar ────────────────────────────────────────────────── */}
        <div className="p-3 sm:p-4 bg-ink-950/60 border-b border-ink-700/60">
          <div className="relative flex items-center">
            <svg
              className="absolute left-3.5 h-4 w-4 text-ink-400"
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search examinations (e.g. JEE, NEET, UPSC)..."
              className="w-full rounded-xl bg-ink-800/90 border border-ink-700/80 pl-10 pr-10 py-2.5 text-sm text-ink-100 placeholder-ink-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-ink-400 hover:text-ink-200 p-1 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── List Content ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto divide-y divide-ink-800/60 p-2 sm:p-3">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 p-3.5 rounded-xl bg-ink-800/40 animate-pulse"
                >
                  <div className="h-11 w-11 rounded-xl bg-ink-700" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-40 rounded bg-ink-700" />
                    <div className="h-3 w-24 rounded bg-ink-700/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-danger/15 text-danger flex items-center justify-center mb-3">
                ⚠️
              </div>
              <p className="text-sm font-semibold text-ink-200">Failed to load exams</p>
              <p className="text-xs text-ink-400 mt-1">
                {error instanceof Error ? error.message : 'Server error'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 rounded-xl bg-accent text-ink-950 text-xs font-bold shadow-glow hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-ink-800 text-ink-400 flex items-center justify-center mb-3 text-lg">
                🔍
              </div>
              <p className="text-sm font-semibold text-ink-200">No exams found</p>
              <p className="text-xs text-ink-400 mt-1">
                No exam matches "{searchQuery}"
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredExams.map((exam, index) => (
                <motion.button
                  key={exam.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(index * 0.03, 0.25) }}
                  onClick={() => navigate(`/exams/${exam.id}/subjects`)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all duration-150 group hover:bg-ink-800/80 border border-transparent hover:border-ink-700/60"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center font-display font-bold text-lg shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                      🏛️
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-sans font-semibold text-sm sm:text-base text-ink-100 truncate block group-hover:text-accent transition-colors">
                        {exam.name}
                      </span>
                      <span className="text-xs text-ink-400 mt-0.5 block">
                        Tap to explore subjects & chapters
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 ml-3 flex items-center gap-1 text-xs font-semibold text-ink-400 group-hover:text-accent group-hover:translate-x-0.5 transition-all">
                    <span className="hidden sm:inline text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                      Subjects
                    </span>
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
