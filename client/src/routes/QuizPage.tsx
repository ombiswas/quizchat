/**
 * QuizPage component.
 *
 * Handcrafted conversational adaptive quiz interface.
 * - Container width strictly matched to navbar (max-w-4xl) for visual alignment.
 * - Fully responsive across mobile, tablet, and desktop viewports.
 * - Questions appear as incoming chat bubbles (left-aligned) with clean typography.
 * - 4 interactive options render in a tactile bottom tray.
 * - Outgoing answer bubble (right-aligned) with concise correctness tag.
 * - Strictly unidirectional (no back navigation).
 * - Smooth auto-scroll & Framer Motion transitions.
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient, ApiError } from '@/api/client'
import { useSessionStore } from '@/store/sessionStore'

interface OptionItem {
  key: string
  text: string
}

interface QuestionItem {
  id: string
  text: string
  options: OptionItem[]
}

interface SubmitResponse {
  is_correct: boolean
  correct_option: string
  next_question: QuestionItem | null
}

interface ChatMessage {
  id: string
  type: 'incoming_question' | 'outgoing_answer'
  questionIndex?: number
  text: string
  optionKey?: string
  isCorrect?: boolean
  correctOption?: string
  timestamp: string
}

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useSessionStore()

  // Chat thread history and active question
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<QuestionItem | null>(null)
  const [questionIndex, setQuestionIndex] = useState(1)
  const [totalQuestions] = useState(15)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  // Auto-scroll to bottom of chat thread whenever messages change
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isSubmitting])

  // ── Initial Question Fetch ──────────────────────────────────────────────────
  useEffect(() => {
    if (!quizId || !isAuthenticated) return

    let isMounted = true
    setIsLoading(true)

    apiClient
      .get<QuestionItem>(`/api/quizzes/${quizId}/current-question`)
      .then((question) => {
        if (!isMounted) return
        setCurrentQuestion(question)
        setMessages([
          {
            id: `q-${question.id}-${Date.now()}`,
            type: 'incoming_question',
            questionIndex: 1,
            text: question.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        setIsLoading(false)
      })
      .catch((err) => {
        if (!isMounted) return
        if (err instanceof ApiError && err.status === 409) {
          // Quiz already completed -> navigate to results
          navigate(`/quiz/${quizId}/result`)
          return
        }
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load question')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [quizId, isAuthenticated, navigate])

  // ── Handle Answer Submission ────────────────────────────────────────────────
  const handleSelectOption = async (option: OptionItem) => {
    if (!quizId || !currentQuestion || isSubmitting) return

    setIsSubmitting(true)
    setSelectedOption(option.key)

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    try {
      const result = await apiClient.post<SubmitResponse>(`/api/quizzes/${quizId}/submit`, {
        question_id: currentQuestion.id,
        selected_option: option.key,
      })

      // 1. Append user's outgoing answer bubble with concise correctness badge
      const answerMessage: ChatMessage = {
        id: `a-${currentQuestion.id}-${Date.now()}`,
        type: 'outgoing_answer',
        text: `${option.key}. ${option.text}`,
        optionKey: option.key,
        isCorrect: result.is_correct,
        correctOption: result.correct_option,
        timestamp: nowStr,
      }

      setMessages((prev) => [...prev, answerMessage])

      // 2. Snappy delay (700ms) for fast chat cadence
      setTimeout(() => {
        if (result.next_question) {
          const nextIndex = questionIndex + 1
          setQuestionIndex(nextIndex)
          setCurrentQuestion(result.next_question)
          setSelectedOption(null)
          setIsSubmitting(false)

          // Append incoming next question bubble
          setMessages((prev) => [
            ...prev,
            {
              id: `q-${result.next_question!.id}-${Date.now()}`,
              type: 'incoming_question',
              questionIndex: nextIndex,
              text: result.next_question!.text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ])
        } else {
          // Quiz completed!
          navigate(`/quiz/${quizId}/result`)
        }
      }, 700)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit answer')
      setIsSubmitting(false)
      setSelectedOption(null)
    }
  }

  // Progress percentage
  const progressPct = Math.min(((questionIndex - 1) / totalQuestions) * 100, 100)

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start space-y-4">
      {/* ── Main Chat Canvas ─────────────────────────────────────────────── */}
      <div className="w-full flex flex-col h-[calc(100vh-7rem)] max-h-[860px] bg-ink-900/90 border border-ink-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl">
        {/* ── Quiz Thread Header (Progress & Meta) ────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-ink-800 bg-ink-950/60 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-md bg-accent/15 border border-accent/30 text-accent font-mono text-[10px] uppercase font-bold tracking-wider">
                Active
              </span>
              <div>
                <h1 className="font-display text-base sm:text-lg font-bold text-ink-100 flex items-center gap-2">
                  Adaptive Quiz Session
                </h1>
                <p className="text-[11px] font-mono text-ink-400">
                  Single Attempt / Strictly Forward Progression
                </p>
              </div>
            </div>

            {/* Question Counter Pill */}
            <div className="flex items-center gap-1.5 bg-ink-900 px-3.5 py-1.5 rounded-full border border-ink-800 shadow-sm font-mono text-xs">
              <span className="text-ink-400">Question</span>
              <span className="font-bold text-accent">
                {String(questionIndex).padStart(2, '0')}
              </span>
              <span className="text-ink-600">/</span>
              <span className="text-ink-400">{String(totalQuestions).padStart(2, '0')}</span>
            </div>
          </div>

          {/* Micro Linear Progress Bar */}
          <div className="w-full bg-ink-800/80 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-accent h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* ── Chat Thread Stream ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 max-w-xl">
                <div className="h-8 w-8 rounded-full bg-ink-700 animate-pulse shrink-0" />
                <div className="bubble-in w-full space-y-2 animate-pulse">
                  <div className="h-4 bg-ink-700 rounded w-3/4" />
                  <div className="h-4 bg-ink-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-danger/15 text-danger flex items-center justify-center mb-3 text-lg">
                ⚠️
              </div>
              <p className="text-sm font-semibold text-ink-200">Error in Quiz Session</p>
              <p className="text-xs text-ink-400 mt-1">{errorMessage}</p>
              <button
                onClick={() => navigate('/exams')}
                className="mt-4 px-4 py-2 rounded-xl bg-ink-800 text-ink-200 hover:text-white text-xs font-medium border border-ink-700"
              >
                Return to Exams
              </button>
            </div>
          ) : (
            <>
              {/* Message Bubbles History */}
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`flex flex-col ${
                      msg.type === 'outgoing_answer' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {msg.type === 'incoming_question' ? (
                      /* Incoming Question Bubble (Left) */
                      <div className="flex items-start gap-3 max-w-2xl sm:max-w-3xl">
                        <div className="h-8 w-8 rounded-xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 shadow-sm">
                          Q{msg.questionIndex}
                        </div>
                        <div className="bubble-in">
                          <p className="text-sm sm:text-base leading-relaxed text-ink-100 font-sans font-medium">
                            {msg.text}
                          </p>
                          <div className="flex items-center justify-between gap-4 mt-2.5 text-[10px] text-ink-400 font-mono pt-2 border-t border-ink-700/40">
                            <span>Adaptive Assessment #{msg.questionIndex}</span>
                            <span>{msg.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Outgoing Answer Bubble (Right) */
                      <div className="flex flex-col items-end max-w-xl">
                        <div className="bubble-out">
                          <p className="text-sm sm:text-base font-semibold leading-snug">
                            {msg.text}
                          </p>
                        </div>
                        {/* Concise Correctness Pill Tag */}
                        <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold">
                          {msg.isCorrect ? (
                            <span className="text-emerald-400 flex items-center gap-1 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                              ✓ Correct (+1)
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1 bg-rose-500/15 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                              ✕ Incorrect [Expected: {msg.correctOption}]
                            </span>
                          )}
                          <span className="text-[10px] text-ink-400 ml-1">{msg.timestamp}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Submitting / Advancing indicator */}
              {isSubmitting && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-xs text-ink-400 ml-11 italic font-mono"
                >
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-bounce [animation-delay:0.4s]" />
                  </div>
                  <span>Evaluating and preparing next topic...</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ── Active Question Interactive Options (Bottom Tray) ──────────── */}
        {currentQuestion && !isLoading && !errorMessage && (
          <div className="p-4 sm:p-5 bg-ink-950/90 border-t border-ink-800 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between text-xs text-ink-400 font-mono">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-ink-400">
                Select your response:
              </span>
              <span className="text-[10px] text-ink-400">
                Single attempt / Auto-evaluates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map((option) => {
                const isPicked = selectedOption === option.key
                return (
                  <button
                    key={option.key}
                    onClick={() => handleSelectOption(option)}
                    disabled={isSubmitting}
                    className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl text-left text-xs sm:text-sm font-medium transition-all duration-150 border ${
                      isPicked
                        ? 'bg-accent text-ink-950 border-accent font-bold shadow-glow scale-[0.98]'
                        : 'bg-ink-850/80 text-ink-100 border-ink-800 hover:border-accent/60 hover:bg-ink-800 active:scale-[0.98]'
                    } ${isSubmitting && !isPicked ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono font-bold text-xs ${
                        isPicked
                          ? 'bg-ink-950 text-accent'
                          : 'bg-ink-900 text-ink-300 border border-ink-700/60'
                      }`}
                    >
                      {option.key}
                    </span>
                    <span className="flex-1 leading-snug break-words">
                      {option.text}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
