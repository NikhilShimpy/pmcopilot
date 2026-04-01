'use client'

import Link from 'next/link'
import { motion, type MotionProps } from 'framer-motion'

interface SectionHeadingProps {
  kicker: string
  title: string
  description: string
  align?: 'left' | 'center'
  className?: string
}

interface LinkButtonProps {
  href: string
  children: React.ReactNode
  className?: string
}

interface PanelProps {
  className?: string
  children: React.ReactNode
}

export function SectionHeading({
  kicker,
  title,
  description,
  align = 'left',
  className = '',
}: SectionHeadingProps) {
  const alignment = align === 'center' ? 'text-center items-center' : 'text-left items-start'

  return (
    <div className={`mx-auto flex max-w-3xl flex-col gap-4 ${alignment} ${className}`}>
      <span className="inline-flex items-center rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
        {kicker}
      </span>
      <h2 className="font-display text-balance text-3xl font-semibold text-slate-100 sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="max-w-2xl text-pretty text-sm leading-relaxed text-slate-300 sm:text-base">
        {description}
      </p>
    </div>
  )
}

export function PrimaryLinkButton({
  href,
  children,
  className = '',
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-18px_rgba(59,130,246,0.8)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_-18px_rgba(59,130,246,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${className}`}
    >
      {children}
    </Link>
  )
}

export function SecondaryLinkButton({
  href,
  children,
  className = '',
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl border border-white/15 bg-slate-900/60 px-5 py-3 text-sm font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur transition-colors duration-200 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${className}`}
    >
      {children}
    </Link>
  )
}

export function MotionPanel({ className = '', children, ...motionProps }: PanelProps & MotionProps) {
  return (
    <motion.div
      className={`public-depth-card rounded-2xl border border-white/10 bg-slate-900/65 p-6 backdrop-blur-xl ${className}`}
      {...motionProps}
    >
      {children}
    </motion.div>
  )
}

