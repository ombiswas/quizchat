/**
 * LoginPage component.
 *
 * Styled strictly like a chat application's "New Chat / Contact List" selector.
 * - Search bar pinned at the top for instant filtering.
 * - Clean scrollable list of seeded learner profiles.
 * - Each row exhibits avatar-initials, full name, status, and instant tap-to-login.
 * - Eliminates generic "card with dropdown" forms.
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

// Generate deterministic avatar color hue based on name string
function getAvatarBgColor(name: string): string {
  const hues = [
    'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'bg-rose-500/20 text-rose-300 border-rose-500/40',
    'bg-blue-500/20 text-blue-300 border-blue-500/40',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return hues[Math.abs(hash) % hues.length]
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

  return (
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-lg flex flex-col h-[calc(100vh-6.5rem)] max-h-[820px] bg-ink-900/90 border border-ink-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* ── Contact Header ─────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 border-b border-ink-700/80 bg-ink-900 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-ink-100">
                Select Profile
              </h1>
              <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-mono font-semibold text-accent border border-accent/30">
                {users.length} available
              </span>
            </div>
            <p className="text-xs text-ink-400 mt-0.5">
              Choose your profile to begin the adaptive quiz session
            </p>
          </div>
        </div>

        {/* ── Search Input Box ────────────────────────────────────────────── */}
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
              placeholder="Search learner by name or ID..."
              className="w-full rounded-xl bg-ink-800/90 border border-ink-700/80 pl-10 pr-10 py-2.5 text-sm text-ink-100 placeholder-ink-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
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
        </div>

        {/* ── Error Banner ────────────────────────────────────────────────── */}
        {loginMutation.isError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-danger/15 border border-danger/30 text-xs text-danger flex items-center justify-between">
            <span>
              Authentication failed:{' '}
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : 'Server error'}
            </span>
            <button
              onClick={() => loginMutation.reset()}
              className="font-bold underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Contact List ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto divide-y divide-ink-800/60 p-2 sm:p-3">
          {isLoading ? (
            /* Skeleton Loading State */
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 p-3 rounded-xl bg-ink-800/40 animate-pulse"
                >
                  <div className="h-10 w-10 rounded-full bg-ink-700" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 rounded bg-ink-700" />
                    <div className="h-3 w-20 rounded bg-ink-700/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            /* Error State */
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-danger/15 text-danger flex items-center justify-center mb-3">
                ⚠️
              </div>
              <p className="text-sm font-semibold text-ink-200">
                Failed to load learners
              </p>
              <p className="text-xs text-ink-400 mt-1 max-w-xs">
                {error instanceof Error ? error.message : 'Please check your connection.'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 rounded-xl bg-accent text-ink-950 text-xs font-bold shadow-glow hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            /* Empty Search Results */
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-ink-800 text-ink-400 flex items-center justify-center mb-3 text-lg">
                🔍
              </div>
              <p className="text-sm font-semibold text-ink-200">No learners found</p>
              <p className="text-xs text-ink-400 mt-1">
                No profiles match "{searchQuery}"
              </p>
            </div>
          ) : (
            /* Contact Rows */
            <AnimatePresence>
              {filteredUsers.map((user, index) => {
                const isSelected = selectedUserId === user.id
                const isLoggingIn = isSelected && loginMutation.isPending
                const avatarStyle = getAvatarBgColor(user.name)

                return (
                  <motion.button
                    key={user.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.25) }}
                    onClick={() => handleUserSelect(user)}
                    disabled={loginMutation.isPending}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-150 group ${
                      isSelected
                        ? 'bg-accent/15 border border-accent/50 shadow-glow'
                        : 'hover:bg-ink-800/80 border border-transparent hover:border-ink-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar initials */}
                      <div
                        className={`h-11 w-11 rounded-full flex items-center justify-center font-mono font-bold text-sm border shadow-sm shrink-0 transition-transform group-hover:scale-105 ${avatarStyle}`}
                      >
                        {getInitials(user.name)}
                      </div>

                      {/* User Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-sans font-semibold text-sm text-ink-100 truncate group-hover:text-white transition-colors">
                            {user.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-ink-400 mt-0.5">
                          <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span className="font-mono text-[11px] text-ink-400 truncate">
                            ID: {user.id.slice(-6)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Icon / Pending Spinner */}
                    <div className="shrink-0 ml-3">
                      {isLoggingIn ? (
                        <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-ink-400 group-hover:text-accent group-hover:translate-x-0.5 transition-all">
                          <span className="hidden sm:inline text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                            Start
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
