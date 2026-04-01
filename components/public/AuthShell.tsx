'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  Layers3,
  LockKeyhole,
  type LucideIcon,
} from 'lucide-react'
import PublicBackground from './PublicBackground'
import AppLogo from '@/components/shared/AppLogo'

type AuthMode = 'login' | 'signup'

interface AuthShellProps {
  mode: AuthMode
  title: string
  description: string
  children: React.ReactNode
  footerNote: string
}

interface SpotlightItem {
  icon: LucideIcon
  title: string
  detail: string
}

const SPOTLIGHT_BY_MODE: Record<
  AuthMode,
  {
    badge: string
    heading: string
    summary: string
    metrics: Array<{ label: string; value: string }>
    points: SpotlightItem[]
  }
> = {
  login: {
    badge: 'Secure workspace access',
    heading: 'Continue where your product team left off',
    summary:
      'Jump back into insight clusters, roadmap tradeoffs, and AI-backed decisions without losing context.',
    metrics: [
      { label: 'Sections orchestrated', value: '20' },
      { label: 'Feedback patterns mapped', value: '10k+' },
      { label: 'Average turnaround', value: '< 6 min' },
    ],
    points: [
      {
        icon: Layers3,
        title: 'Section-by-section intelligence',
        detail: 'Generate only what you need with token-safe scoped prompts.',
      },
      {
        icon: Bot,
        title: 'Gemini-first analysis engine',
        detail: 'Fast strategic synthesis for PM workflows, prioritization, and PRDs.',
      },
      {
        icon: LockKeyhole,
        title: 'Protected product workspace',
        detail: 'Private sessions, secure routes, and enterprise-ready controls.',
      },
    ],
  },
  signup: {
    badge: 'Launch your PM command center',
    heading: 'Turn raw feedback into confident decisions',
    summary:
      'Set up your workspace and start producing polished strategic outputs with one premium AI operating flow.',
    metrics: [
      { label: 'Setup time', value: '2 min' },
      { label: 'Strategic sections', value: '20' },
      { label: 'Built for PM teams', value: 'Global' },
    ],
    points: [
      {
        icon: Layers3,
        title: 'Complete product strategy map',
        detail: 'From problem analysis to execution timing, each section is generated on demand.',
      },
      {
        icon: Bot,
        title: 'Actionable AI recommendations',
        detail: 'Prioritized features, risks, timelines, and impact signals in one flow.',
      },
      {
        icon: BadgeCheck,
        title: 'Production-grade foundation',
        detail: 'Typed APIs, resilient auth, and stable architecture for shipping teams.',
      },
    ],
  },
}

export default function AuthShell({
  mode,
  title,
  description,
  children,
  footerNote,
}: AuthShellProps) {
  const spotlight = SPOTLIGHT_BY_MODE[mode]
  const alternate =
    mode === 'login'
      ? { text: 'Need an account?', label: 'Create one', href: '/signup' }
      : { text: 'Already have an account?', label: 'Sign in', href: '/login' }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <PublicBackground variant="auth" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/55 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800/65"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to website
          </Link>

          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2.5 py-1 text-xs uppercase tracking-[0.18em] text-cyan-100">
            <AppLogo size={20} priority className="rounded-md border-white/20 bg-slate-950/80" />
            PMCopilot
          </div>
        </header>

        <div className="grid flex-1 items-stretch gap-6 py-4 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="hidden overflow-hidden rounded-3xl border border-white/10 bg-slate-900/55 p-8 shadow-[0_45px_120px_-60px_rgba(56,189,248,0.55)] backdrop-blur-xl lg:flex lg:flex-col"
          >
            <span className="mb-5 inline-flex w-fit rounded-full border border-cyan-300/25 bg-cyan-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              {spotlight.badge}
            </span>
            <h1 className="font-display text-balance text-4xl font-semibold leading-tight text-slate-50">
              {spotlight.heading}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300">
              {spotlight.summary}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {spotlight.metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/12 bg-slate-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <p className="text-xl font-semibold text-slate-50">{metric.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7 space-y-3">
              {spotlight.points.map((point, index) => (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + index * 0.1 }}
                  className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl border border-cyan-300/20 bg-cyan-500/12 p-2 text-cyan-100">
                      <point.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{point.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{point.detail}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
            className="flex flex-col justify-center rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-[0_45px_120px_-65px_rgba(56,189,248,0.75)] backdrop-blur-xl sm:p-8"
          >
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/90">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </p>
              <h2 className="font-display mt-3 text-3xl font-semibold text-slate-50 sm:text-4xl">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                {description}
              </p>
            </div>

            {children}

            <p className="mt-7 text-center text-xs text-slate-400">{footerNote}</p>
            <p className="mt-3 text-center text-sm text-slate-300">
              {alternate.text}{' '}
              <Link href={alternate.href} className="font-semibold text-cyan-200 hover:text-cyan-100">
                {alternate.label}
              </Link>
            </p>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
