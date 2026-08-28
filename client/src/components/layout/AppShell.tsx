import React from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'

export const AppShell: React.FC = () => {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 flex flex-col antialiased selection:bg-accent selection:text-ink-950">
      {/* Top Header Bar */}
      <TopBar />

      {/* Main Page Viewport Container */}
      <main className="flex-1 w-full flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
