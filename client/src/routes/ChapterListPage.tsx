/**
 * ChapterListPage component.
 *
 * Displays all chapters belonging to the chosen subject.
 * - Back button to return to previous subjects view
 * - Pinned search filter
 * - High-contrast chapter cards with topic numbering
 * - Single-tap chapter selection calls POST /api/quizzes and launches the Quiz session
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
  first_question: {
    id: string
    text: string
    options: Array<{
      key: string
      text: string
    }>
  }
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
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-lg flex flex-col h-[calc(100vh-6.5rem)] max-h-[820px] bg-ink-900/90 border border-ink-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* ── Header with Back Button ───────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-ink-700/80 bg-ink-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-800 text-ink-300 hover:text-white hover:bg-ink-750 border border-ink-700/60 transition-colors shrink-0"
              title="Back"
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
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-ink-100">
                  Select Chapter
                </h1>
                <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-mono font-semibold text-accent border border-accent/30">
                  {chapters.length} topics
                </span>
              </div>
              <p className="text-xs text-ink-400 mt-0.5">
                Tap a topic to launch an adaptive 15-question session
              </p>
            </div>
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
              placeholder="Search chapters (e.g. Kinematics, Thermodynamics)..."
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

        {/* ── Error Banner ──────────────────────────────────────────────── */}
        {createQuizMutation.isError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-danger/15 border border-danger/30 text-xs text-danger flex items-center justify-between">
            <span>
              Failed to start quiz:{' '}
              {createQuizMutation.error instanceof Error
                ? createQuizMutation.error.message
                : 'Server error'}
            </span>
            <button
              onClick={() => createQuizMutation.reset()}
              className="font-bold underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── List Content ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto divide-y divide-ink-800/60 p-2 sm:p-3">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 p-3.5 rounded-xl bg-ink-800/40 animate-pulse"
                >
                  <div className="h-10 w-10 rounded-xl bg-ink-700" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-44 rounded bg-ink-700" />
                    <div className="h-3 w-28 rounded bg-ink-700/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-danger/15 text-danger flex items-center justify-center mb-3">
                ⚠️
              </div>
              <p className="text-sm font-semibold text-ink-200">Failed to load chapters</p>
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
          ) : filteredChapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-ink-800 text-ink-400 flex items-center justify-center mb-3 text-lg">
                🔍
              </div>
              <p className="text-sm font-semibold text-ink-200">No chapters found</p>
              <p className="text-xs text-ink-400 mt-1">
                No chapter matches "{searchQuery}"
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredChapters.map((chapter, index) => {
                const isSelected = selectedChapterId === chapter.id
                const isCreating = isSelected && createQuizMutation.isPending

                return (
                  <motion.button
                    key={chapter.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.25) }}
                    onClick={() => handleChapterSelect(chapter)}
                    disabled={createQuizMutation.isPending}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all duration-150 group ${
                      isSelected
                        ? 'bg-accent/15 border border-accent/50 shadow-glow'
                        : 'hover:bg-ink-800/80 border border-transparent hover:border-ink-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Topic Numbering Badge */}
                      <div className="h-10 w-10 rounded-xl bg-ink-800/90 text-accent font-mono font-bold text-xs border border-accent/25 flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                        #{String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-sans font-semibold text-sm sm:text-base text-ink-100 truncate block group-hover:text-accent transition-colors">
                          {chapter.name}
                        </span>
                        <span className="text-xs text-ink-400 mt-0.5 block flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                          <span>15 Adaptive Questions • Tap to start</span>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 ml-3 flex items-center">
                      {isCreating ? (
                        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-ink-400 group-hover:text-accent group-hover:translate-x-0.5 transition-all">
                          <span className="hidden sm:inline text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                            Launch
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
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  )
}
