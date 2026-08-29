/**
 * ChapterListPage component.
 *
 * Modern chapter selection dashboard.
 * - Spacious layout (max-w-4xl) with breadcrumbs & back affordance
 * - 2-column responsive chapter grid with topic indexes
 * - Single-tap chapter selection calls POST /api/quizzes and launches the adaptive quiz session
 */

import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/api/client'
import { useSessionStore } from '@/store/sessionStore'

interface ChapterItem {
  id: string
  subject_id: string
  name: string
}

interface QuizStartResponse {
  quiz_id: string
}

export default function ChapterListPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useSessionStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const {
    data: chapters = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ChapterItem[]>({
    queryKey: ['chapters', subjectId],
    queryFn: () => apiClient.get<ChapterItem[]>(`/api/subjects/${subjectId}/chapters`),
    enabled: isAuthenticated && Boolean(subjectId),
  })

  // ── Quiz initiation mutation ────────────────────────────────────────────────
  const createQuizMutation = useMutation({
    mutationFn: (chapter: ChapterItem) =>
      apiClient.post<QuizStartResponse>('/api/quizzes', { chapter_id: chapter.id }),
    onSuccess: (data) => {
      navigate(`/quiz/${data.quiz_id}`)
    },
    onError: () => {
      setSelectedChapterId(null)
    },
  })

  const handleChapterSelect = (chapter: ChapterItem) => {
    if (createQuizMutation.isPending) return
    setSelectedChapterId(chapter.id)
    createQuizMutation.mutate(chapter)
  }

  const filteredChapters = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return chapters
    return chapters.filter((c) => c.name.toLowerCase().includes(q))
  }, [chapters, searchQuery])

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start space-y-6">
      {/* ── Breadcrumb & Back Navigation ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ink-800/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-ink-300 hover:text-white hover:bg-ink-800 border border-ink-800 transition-colors shrink-0 shadow-sm"
            title="Back to Subjects"
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
              <span className="cursor-pointer hover:text-ink-200" onClick={() => navigate(-1)}>
                Subjects
              </span>
              <span>/</span>
              <span className="text-accent font-semibold">Chapters</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-100 tracking-tight">
              Select Chapter
            </h1>
          </div>
        </div>

        <span className="text-xs font-mono text-ink-400 self-start sm:self-auto">
          Tap any topic to launch an adaptive 15-question quiz
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
              placeholder="Search chapters (e.g. Kinematics, Calculus, Preamble)..."
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
              {filteredChapters.length} Chapters
            </span>
          </div>
        </div>

        {/* ── Error Banner ────────────────────────────────────────────────── */}
        {createQuizMutation.isError && (
          <div className="m-4 p-3.5 rounded-xl bg-danger/15 border border-danger/30 text-xs text-danger flex items-center justify-between">
            <span>
              Failed to start quiz:{' '}
              {createQuizMutation.error instanceof Error
                ? createQuizMutation.error.message
                : 'Server error'}
            </span>
            <button
              onClick={() => createQuizMutation.reset()}
              className="font-bold underline ml-2 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Chapters Grid Area ──────────────────────────────────────────── */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[580px]">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-ink-850/50 border border-ink-800 flex items-center gap-3 animate-pulse"
                >
                  <div className="h-10 w-10 rounded-xl bg-ink-750 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-36 bg-ink-700 rounded" />
                    <div className="h-3 w-20 bg-ink-750 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-full bg-danger/15 text-danger flex items-center justify-center text-lg">
                ⚠️
              </div>
              <p className="text-sm font-semibold text-ink-200">Failed to load chapters</p>
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
          ) : filteredChapters.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-full bg-ink-800 text-ink-400 flex items-center justify-center text-base">
                🔍
              </div>
              <p className="text-sm font-semibold text-ink-200">No chapters found</p>
              <p className="text-xs text-ink-400">
                No chapters match "{searchQuery}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <AnimatePresence>
                {filteredChapters.map((chapter, idx) => {
                  const isSelected = selectedChapterId === chapter.id
                  const isCreating = isSelected && createQuizMutation.isPending

                  return (
                    <motion.button
                      key={chapter.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                      onClick={() => handleChapterSelect(chapter)}
                      disabled={createQuizMutation.isPending}
                      className={`group p-4 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-accent/15 border-accent shadow-glow scale-[0.99]'
                          : 'bg-ink-850/60 border-ink-800 hover:border-accent/40 hover:bg-ink-800/90 active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Topic index */}
                        <div className="h-10 w-10 rounded-xl bg-ink-900 text-accent font-mono font-bold text-xs border border-accent/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                          #{String(idx + 1).padStart(2, '0')}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-sans font-semibold text-xs sm:text-sm text-ink-100 truncate group-hover:text-white transition-colors">
                            {chapter.name}
                          </p>
                          <div className="mt-0.5">
                            <span className="font-mono text-[10px] text-ink-400">
                              15 Adaptive Questions
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Launch Action */}
                      <div className="shrink-0 flex items-center">
                        {isCreating ? (
                          <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-ink-900 group-hover:bg-accent group-hover:text-ink-950 text-ink-400 flex items-center justify-center transition-all">
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
                        )}
                      </div>
                    </motion.button>
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
