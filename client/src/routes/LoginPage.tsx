/**
 * LoginPage component.
 *
 * Handcrafted learner profile directory & instant session launcher.
 * - Modern 2-column responsive layout with clear visual hierarchy.
 * - Instant search filter with clear action and quick random profile selection.
 * - High-craft profile cards with deterministic avatars, status tags, and smooth hover micro-interactions.
 * - No passwords or friction: single-tap instant authentication with JWT token issuance.
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { apiClient } from '@/api/client'
import { useSessionStore, SessionUser } from '@/store/sessionStore'

interface UserListItem {
  id: string
  name: string
}

interface LoginResponse {
  access_token: string
  token_type: string
}

// Generate deterministic avatar gradient/color based on user name
function getAvatarBgColor(name: string): { bg: string; text: string; border: string } {
  const palettes = [
    { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30' },
    { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
    { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
    { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
    { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' },
    { bg: 'bg-teal-500/15', text: 'text-teal-300', border: 'border-teal-500/30' },
    { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' },
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palettes[Math.abs(hash) % palettes.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function LoginPage() {
  const navigate = useNavigate()
  const loginToStore = useSessionStore((state) => state.login)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // ── Fetch users list ────────────────────────────────────────────────────────
  const {
    data: users = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<UserListItem[]>({
    queryKey: ['users'],
    queryFn: () => apiClient.get<UserListItem[]>('/api/users'),
  })

  // ── Login mutation ──────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (user: UserListItem) =>
      apiClient.post<LoginResponse>('/api/auth/login', { user_id: user.id }),
    onSuccess: (data, user) => {
      const sessionUser: SessionUser = { id: user.id, name: user.name }
      loginToStore(sessionUser, data.access_token)
      navigate('/exams')
    },
    onError: () => {
      setSelectedUserId(null)
    },
  })

  const handleUserSelect = (user: UserListItem) => {
    if (loginMutation.isPending) return
    setSelectedUserId(user.id)
    loginMutation.mutate(user)
  }

  // ── Filter users based on search query ──────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return users
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q),
    )
  }, [users, searchQuery])

  // Random quick login
  const handleRandomSelect = () => {
    if (!users.length || loginMutation.isPending) return
    const randomUser = users[Math.floor(Math.random() * users.length)]
    handleUserSelect(randomUser)
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start space-y-6">
      {/* ── Brand & Welcome Banner ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-ink-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-accent font-semibold">
              Adaptive Cognitive Quiz Assessment
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-100 tracking-tight">
            Select Learner Profile
          </h1>
          <p className="text-xs sm:text-sm text-ink-400 max-w-xl">
            Choose any learner account below for instant 1-tap authentication. No passwords needed.
          </p>
        </div>

        {/* Quick Demo Pick CTA */}
        {users.length > 0 && (
          <button
            onClick={handleRandomSelect}
            disabled={loginMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-800 hover:bg-ink-750 text-ink-200 hover:text-white border border-ink-700/80 text-xs font-semibold font-mono transition-all self-start sm:self-auto hover:border-accent/40 shadow-sm active:scale-95"
          >
            <span>🎲 Quick Random Login</span>
          </button>
        )}
      </div>

      {/* ── Main Container ────────────────────────────────────────────────── */}
      <div className="w-full bg-ink-900/90 border border-ink-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl flex flex-col">
        {/* ── Search & Filter Toolbar ─────────────────────────────────────── */}
        <div className="p-4 sm:p-5 bg-ink-950/50 border-b border-ink-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
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
              placeholder="Search by student name..."
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

          {/* Counts & Status Pill */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-mono text-ink-400">
            <span>Showing</span>
            <span className="font-bold text-accent px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
              {filteredUsers.length}
            </span>
            <span>of {users.length} profiles</span>
          </div>
        </div>

        {/* ── Error Notification ──────────────────────────────────────────── */}
        {loginMutation.isError && (
          <div className="m-4 p-3.5 rounded-xl bg-danger/15 border border-danger/30 text-xs text-danger flex items-center justify-between">
            <span>
              Authentication failed:{' '}
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : 'Server error'}
            </span>
            <button
              onClick={() => loginMutation.reset()}
              className="font-bold underline ml-2 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Profiles Grid Area ──────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[560px]">
          {isLoading ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-ink-850/50 border border-ink-800 flex items-center gap-3.5 animate-pulse"
                >
                  <div className="h-10 w-10 rounded-xl bg-ink-750 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 bg-ink-700 rounded" />
                    <div className="h-3 w-20 bg-ink-750 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            /* Error State */
            <div className="py-12 px-4 text-center space-y-3">
              <div className="h-12 w-12 mx-auto rounded-full bg-danger/15 text-danger flex items-center justify-center text-lg">
                ⚠️
              </div>
              <p className="text-sm font-semibold text-ink-200">Unable to load learner directory</p>
              <p className="text-xs text-ink-400 max-w-sm mx-auto">
                {error instanceof Error ? error.message : 'Please check database connectivity.'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-xl bg-accent text-ink-950 text-xs font-bold shadow-glow hover:opacity-90 transition-opacity"
              >
                Retry Connection
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            /* Empty Search State */
            <div className="py-12 px-4 text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-full bg-ink-800 text-ink-400 flex items-center justify-center text-base">
                🔍
              </div>
              <p className="text-sm font-semibold text-ink-200">No matching learners</p>
              <p className="text-xs text-ink-400">
                No profiles match "{searchQuery}". Try a different name or clear the search.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs font-mono text-accent hover:underline"
              >
                Clear search query
              </button>
            </div>
          ) : (
            /* 2-Column Responsive Card Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence>
                {filteredUsers.map((userItem, idx) => {
                  const isSelected = selectedUserId === userItem.id
                  const isLoggingIn = isSelected && loginMutation.isPending
                  const palette = getAvatarBgColor(userItem.name)

                  return (
                    <motion.button
                      key={userItem.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(idx * 0.015, 0.2) }}
                      onClick={() => handleUserSelect(userItem)}
                      disabled={loginMutation.isPending}
                      className={`group relative p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-150 flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-accent/15 border-accent shadow-glow scale-[0.99]'
                          : 'bg-ink-850/60 border-ink-800 hover:border-accent/40 hover:bg-ink-800/90 active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar */}
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs border shrink-0 transition-transform group-hover:scale-105 shadow-sm ${palette.bg} ${palette.text} ${palette.border}`}
                        >
                          {getInitials(userItem.name)}
                        </div>

                        {/* Name & ID */}
                        <div className="min-w-0 flex-1">
                          <p className="font-sans font-semibold text-xs sm:text-sm text-ink-100 truncate group-hover:text-white transition-colors">
                            {userItem.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="font-mono text-[10px] text-ink-400 truncate">
                              ID: {userItem.id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="shrink-0 flex items-center">
                        {isLoggingIn ? (
                          <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-ink-800/80 group-hover:bg-accent group-hover:text-ink-950 text-ink-400 flex items-center justify-center transition-all">
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

        {/* ── Footer Bar ──────────────────────────────────────────────────── */}
        <div className="px-5 py-3.5 bg-ink-950/60 border-t border-ink-800 flex items-center justify-between text-[11px] font-mono text-ink-400">
          <span>Single-Sign-On Demo Mode</span>
          <span className="text-ink-400">JWT Token Session Duration: 24h</span>
        </div>
      </div>
    </div>
  )
}
