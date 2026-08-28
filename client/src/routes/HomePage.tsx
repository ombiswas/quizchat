/**
 * Placeholder Home route.
 *
 * This screen exists solely to confirm:
 *   1. react-router-dom is routing correctly
 *   2. Tailwind CSS classes compile and apply visibly
 *   3. The custom design tokens (ink palette, accent colour) are working
 *
 * It will be replaced by the real Login screen in Phase 5.
 */

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-ink-950 p-8">
      {/* ── Brand header ── */}
      <div className="text-center">
        <h1 className="font-display text-5xl font-bold text-accent">
          QuizChat
        </h1>
        <p className="mt-2 font-sans text-ink-600">
          WhatsApp-style quiz application
        </p>
      </div>

      {/* ── Tailwind smoke-test swatches ── */}
      <div className="w-full max-w-sm space-y-3">
        <p className="text-xs uppercase tracking-widest text-ink-600">
          Design token smoke test
        </p>

        {/* Colour tokens */}
        <div className="flex gap-2">
          <div className="h-10 w-10 rounded bg-ink-950 border border-ink-700" title="ink-950" />
          <div className="h-10 w-10 rounded bg-ink-900 border border-ink-700" title="ink-900" />
          <div className="h-10 w-10 rounded bg-ink-800 border border-ink-700" title="ink-800" />
          <div className="h-10 w-10 rounded bg-ink-700 border border-ink-700" title="ink-700" />
          <div className="h-10 w-10 rounded bg-accent border border-ink-700" title="accent" />
          <div className="h-10 w-10 rounded bg-success border border-ink-700" title="success" />
          <div className="h-10 w-10 rounded bg-danger border border-ink-700" title="danger" />
        </div>

        {/* Typography */}
        <div className="rounded-lg bg-ink-900 p-4 space-y-1">
          <p className="font-display text-2xl text-white">Display face — DM Serif</p>
          <p className="font-sans text-base text-white">Body text — Manrope</p>
          <p className="font-sans text-sm text-ink-600">Muted text — ink-600</p>
        </div>

        {/* Bubble tokens */}
        <div className="space-y-2">
          <div className="bubble-in max-w-xs">
            Incoming question bubble (bubble-in)
          </div>
          <div className="bubble-out ml-auto max-w-xs text-right">
            Your answer (bubble-out)
          </div>
        </div>

        {/* CTA button */}
        <button className="w-full rounded-lg bg-accent py-3 font-sans font-semibold text-ink-950 transition hover:bg-accent-light active:bg-accent-dark">
          Start Quiz →
        </button>
      </div>
    </div>
  )
}
