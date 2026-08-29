/**
 * ExamListPage component.
 *
 * Modern curriculum exam selection dashboard.
 * - Spacious responsive layout (max-w-4xl)
 * - Rich examination track cards with domain badges and structured navigation
 * - Smooth drill-down to /exams/:examId/subjects
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
  description?: string
}

// Track icons & metadata mapping
function getExamMeta(name: string): { icon: string; subtitle: string; tag: string; gradient: string } {
  const lower = name.toLowerCase()
  if (lower.includes('jee')) {
    return {
      icon: '📐',
      subtitle: 'Engineering Entrance • Physics, Chemistry & Math',
      tag: 'Engineering Track',
      gradient: 'from-cyan-500/10 to-transparent border-cyan-500/30',
    }
  }
  if (lower.includes('neet')) {
    return {
      icon: '🧬',
      subtitle: 'Medical Admissions • Biology, Botany & Physiology',
      tag: 'Medical Track',
      gradient: 'from-emerald-500/10 to-transparent border-emerald-500/30',
    }
  }
  if (lower.includes('upsc')) {
    return {
      icon: '🏛️',
      subtitle: 'Civil Services • Polity, History, Economy & Geography',
      tag: 'Civil Services Track',
      gradient: 'from-amber-500/10 to-transparent border-amber-500/30',
    }
  }
  return {
    icon: '📚',
    subtitle: 'Comprehensive Curriculum & Practice Modules',
    tag: 'Academic Track',
    gradient: 'from-accent/10 to-transparent border-accent/30',
  }
}

export default function ExamListPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useSessionStore()
  const [searchQuery, setSearchQuery] = useState('')

  // Auth guard
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
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start space-y-6">
      {/* ── Header Breadcrumb & Title ──────────────────────────────────────── */}
      <div className="space-y-1 pb-4 border-b border-ink-800/80">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-accent font-semibold">
            Curriculum Navigator
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-100 tracking-tight">
          Select Target Examination
        </h1>
        <p className="text-xs sm:text-sm text-ink-400 max-w-xl">
          Choose a competitive track to access subjects, chapters, and start an adaptive session.
        </p>
      </div>

      {/* ── Main Container ────────────────────────────────────────────────── */}
      <div className="w-full bg-ink-900/90 border border-ink-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl flex flex-col">
        {/* ── Search & Filter Bar ─────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 bg-ink-950/50 border-b border-ink-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md flex items-center">
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter examinations (JEE, NEET, UPSC)..."
              className="w-full rounded-xl bg-ink-900 border border-ink-700/80 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-ink-100 placeholder-ink-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-ink-400 hover:text-ink-200 p-1 text-xs"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-mono text-ink-400">
            <span>Available:</span>
            <span className="font-bold text-accent px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
              {filteredExams.length} Tracks
            </span>
          </div>
        </div>

        {/* ── Exam Cards Grid ─────────────────────────────────────────────── */}
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-ink-850/50 border border-ink-800 space-y-3 animate-pulse"
                >
                  <div className="h-10 w-10 rounded-xl bg-ink-750" />
                  <div className="h-5 w-28 bg-ink-700 rounded" />
                  <div className="h-3 w-40 bg-ink-750 rounded" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-full bg-danger/15 text-danger flex items-center justify-center text-lg">
                ⚠️
              </div>
              <p className="text-sm font-semibold text-ink-200">Failed to load examinations</p>
              <p className="text-xs text-ink-400 max-w-sm mx-auto">
                {error instanceof Error ? error.message : 'Please check your connection.'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-accent text-ink-950 text-xs font-bold shadow-glow"
              >
                Retry
              </button>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-full bg-ink-800 text-ink-400 flex items-center justify-center text-base">
                🔍
              </div>
              <p className="text-sm font-semibold text-ink-200">No matching exams</p>
              <p className="text-xs text-ink-400">
                No tracks match "{searchQuery}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <AnimatePresence>
                {filteredExams.map((exam, idx) => {
                  const meta = getExamMeta(exam.name)

                  return (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      onClick={() => navigate(`/exams/${exam.id}/subjects`)}
                      className={`group relative p-5 sm:p-6 rounded-2xl bg-gradient-to-b ${meta.gradient} bg-ink-850/70 border border-ink-800 hover:border-accent/50 hover:bg-ink-800/90 cursor-pointer transition-all duration-200 flex flex-col justify-between shadow-sm`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="h-12 w-12 rounded-2xl bg-ink-900 border border-ink-700/80 flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 transition-transform">
                            {meta.icon}
                          </div>
                          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                            {meta.tag}
                          </span>
                        </div>

                        <div>
                          <h2 className="font-display text-lg sm:text-xl font-bold text-ink-100 group-hover:text-white transition-colors">
                            {exam.name}
                          </h2>
                          <p className="text-xs text-ink-400 leading-relaxed mt-1">
                            {meta.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="pt-5 mt-5 border-t border-ink-800/80 flex items-center justify-between text-xs font-semibold text-accent">
                        <span>Explore Subjects</span>
                        <svg
                          className="h-4 w-4 transform group-hover:translate-x-1 transition-transform"
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
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
