import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSessionStore } from '@/store/sessionStore'

export const TopBar = () => {
  const { user, isAuthenticated, logout } = useSessionStore()
  const location = useLocation()
  const navigate = useNavigate()

  const isAnalytics = location.pathname.startsWith('/analytics')

  return (
    <header className="sticky top-0 z-50 w-full frosted-glass">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <Link
          to={isAuthenticated ? '/exams' : '/'}
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-ink-950 shadow-glow font-bold text-lg">
            ⚡
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold tracking-tight text-ink-100 group-hover:text-accent transition-colors">
              QuizChat
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-ink-400 -mt-1">
              Adaptive Prep
            </span>
          </div>
        </Link>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Analytics Dashboard Button */}
          <Link
            to="/analytics"
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
              isAnalytics
                ? 'bg-accent text-ink-950 shadow-glow'
                : 'bg-ink-800/90 text-ink-200 hover:bg-ink-750 hover:text-white border border-ink-700/60'
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span>Analytics</span>
          </Link>

          {/* User Profile Badge or Login Picker Trigger */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-ink-900 border border-ink-700/70 py-1 pl-1.5 pr-3 shadow-inner-light">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-800 text-xs font-bold text-accent border border-accent/30 font-mono">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-ink-200 max-w-[110px] truncate">
                  {user.name}
                </span>
              </div>

              {/* Logout / Switch User */}
              <button
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                title="Switch User / Logout"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800/80 text-ink-400 hover:text-danger hover:bg-danger/10 transition-colors border border-ink-700/40"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <Link
              to="/"
              className="rounded-full bg-ink-800 border border-ink-700 px-3.5 py-1.5 text-xs font-medium text-ink-300 hover:text-white hover:bg-ink-750 transition-colors"
            >
              Select User
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
