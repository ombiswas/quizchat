/**
 * SubjectListPage component.
 *
 * Modern subject selection dashboard with rich discipline cards.
 * - Spacious layout (max-w-4xl) with breadcrumbs & back affordance
 * - 2-column responsive subject grid with domain iconography
 * - Smooth drill-down to /subjects/:subjectId/chapters
 */

import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/api/client'
import { useSessionStore } from '@/store/sessionStore'

interface SubjectItem {
  id: string
  exam_id: string
  name: string
}

function getSubjectMeta(name: string): { icon: string; tag: string } {
  const lower = name.toLowerCase()
  if (lower.includes('physic')) return { icon: '⚛️', tag: 'Core Physics' }
  if (lower.includes('chem')) return { icon: '🧪', tag: 'Chemistry' }
  if (lower.includes('math')) return { icon: '📐', tag: 'Mathematics' }
  if (lower.includes('botany') || lower.includes('zoology') || lower.includes('bio') || lower.includes('physio')) {
    return { icon: '🧬', tag: 'Life Sciences' }
  }
  if (lower.includes('polity') || lower.includes('hist')) return { icon: '📜', tag: 'Governance & History' }
  if (lower.includes('geo') || lower.includes('eco')) return { icon: '🌍', tag: 'Economics & Geography' }
  return { icon: '📚', tag: 'Academic Discipline' }
}

export default function SubjectListPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useSessionStore()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const {
    data: subjects = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SubjectItem[]>({
    queryKey: ['subjects', examId],
    queryFn: () => apiClient.get<SubjectItem[]>(`/api/exams/${examId}/subjects`),
    enabled: isAuthenticated && Boolean(examId),
  })

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return subjects
    return subjects.filter((s) => s.name.toLowerCase().includes(q))
  }, [subjects, searchQuery])

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start space-y-6">
      {/* ── Breadcrumb & Back Navigation ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink-800/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/exams')}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-ink-300 hover:text-white hover:bg-ink-800 border border-ink-800 transition-colors shrink-0 shadow-sm"
            title="Back to Examinations"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-ink-400 mb-0.5">
              <span className="cursor-pointer hover:text-ink-200" onClick={() => navigate('/exams')}>
                Exams
              </span>
              <span>/</span>
              <span className="text-accent font-semibold">Subjects</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-100 tracking-tight">
              Select Subject
            </h1>
          </div>
        </div>

        <span className="text-xs font-mono text-ink-400 self-start sm:self-auto">
          Choose a discipline to explore chapters
        </span>
      </div>

      {/* ── Main Container ────────────────────────────────────────────────── */}
      <div className="w-full bg-ink-900/90 border border-ink-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl flex flex-col">
        {/* ── Filter Toolbar ──────────────────────────────────────────────── */}
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
              placeholder="Search subjects (e.g. Physics, Calculus, Botany)..."
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
              {filteredSubjects.length} Disciplines
            </span>
          </div>
        </div>

        {/* ── Subjects Grid ───────────────────────────────────────────────── */}
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-ink-850/50 border border-ink-800 flex items-center gap-3 animate-pulse"
                >
                  <div className="h-10 w-10 rounded-xl bg-ink-750 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-28 bg-ink-700 rounded" />
                    <div className="h-3 w-16 bg-ink-750 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-full bg-danger/15 text-danger flex items-center justify-center text-lg">
                ⚠️
              </div>
              <p className="text-sm font-semibold text-ink-200">Failed to load subjects</p>
              <p className="text-xs text-ink-400 max-w-sm mx-auto">
                {error instanceof Error ? error.message : 'Please try again.'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-accent text-ink-950 text-xs font-bold shadow-glow"
              >
                Retry
              </button>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-full bg-ink-800 text-ink-400 flex items-center justify-center text-base">
                🔍
              </div>
              <p className="text-sm font-semibold text-ink-200">No subjects found</p>
              <p className="text-xs text-ink-400">
                No subjects match "{searchQuery}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <AnimatePresence>
                {filteredSubjects.map((subject, idx) => {
                  const meta = getSubjectMeta(subject.name)

                  return (
                    <motion.div
                      key={subject.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: idx * 0.03 }}
                      onClick={() => navigate(`/subjects/${subject.id}/chapters`, { state: { examId } })}
                      className="group p-4 rounded-xl bg-ink-850/60 border border-ink-800 hover:border-accent/40 hover:bg-ink-800/90 cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-ink-900 text-lg flex items-center justify-center border border-ink-700/60 shrink-0 group-hover:scale-105 transition-transform">
                          {meta.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-sans font-semibold text-sm text-ink-100 truncate group-hover:text-white transition-colors">
                            {subject.name}
                          </p>
                          <span className="text-[10px] font-mono text-ink-400 block mt-0.5">
                            {meta.tag}
                          </span>
                        </div>
                      </div>

                      <div className="h-8 w-8 rounded-lg bg-ink-900 group-hover:bg-accent group-hover:text-ink-950 text-ink-400 flex items-center justify-center transition-all shrink-0">
                        <svg
                          className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform"
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
