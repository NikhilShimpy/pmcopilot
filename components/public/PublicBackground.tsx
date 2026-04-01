'use client'

import { motion, useReducedMotion } from 'framer-motion'

type PublicBackgroundVariant = 'landing' | 'auth'

interface PublicBackgroundProps {
  variant?: PublicBackgroundVariant
  className?: string
}

const ORBS: Record<
  PublicBackgroundVariant,
  Array<{
    size: number
    color: string
    top?: string
    left?: string
    right?: string
    bottom?: string
    duration: number
    delay: number
    x: number[]
    y: number[]
  }>
> = {
  landing: [
    {
      size: 520,
      color: 'from-cyan-500/30 via-blue-500/20 to-transparent',
      top: '-12%',
      left: '-10%',
      duration: 16,
      delay: 0,
      x: [0, 30, -10, 0],
      y: [0, -20, 20, 0],
    },
    {
      size: 440,
      color: 'from-indigo-500/25 via-sky-500/20 to-transparent',
      top: '14%',
      right: '-10%',
      duration: 18,
      delay: 1.5,
      x: [0, -20, 10, 0],
      y: [0, 30, -20, 0],
    },
    {
      size: 600,
      color: 'from-violet-500/22 via-fuchsia-500/14 to-transparent',
      bottom: '-22%',
      left: '22%',
      duration: 20,
      delay: 0.8,
      x: [0, 25, -20, 0],
      y: [0, -15, 10, 0],
    },
  ],
  auth: [
    {
      size: 460,
      color: 'from-blue-500/22 via-cyan-500/15 to-transparent',
      top: '-18%',
      left: '-10%',
      duration: 14,
      delay: 0,
      x: [0, 25, -10, 0],
      y: [0, -20, 10, 0],
    },
    {
      size: 380,
      color: 'from-indigo-500/20 via-violet-500/15 to-transparent',
      bottom: '-20%',
      right: '-8%',
      duration: 17,
      delay: 1,
      x: [0, -15, 10, 0],
      y: [0, 20, -15, 0],
    },
  ],
}

export default function PublicBackground({
  variant = 'landing',
  className = '',
}: PublicBackgroundProps) {
  const reduceMotion = useReducedMotion()

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_16%_-12%,rgba(56,189,248,0.16),transparent_55%),radial-gradient(900px_620px_at_94%_10%,rgba(99,102,241,0.14),transparent_58%),radial-gradient(1000px_820px_at_52%_118%,rgba(79,70,229,0.14),transparent_60%)]" />
      <div className="public-grid-overlay absolute inset-0 opacity-70" />
      {ORBS[variant].map((orb, index) => (
        <motion.div
          key={`${variant}-${index}`}
          className={`absolute rounded-full bg-gradient-to-br ${orb.color} blur-[70px]`}
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            right: orb.right,
            bottom: orb.bottom,
          }}
          animate={
            reduceMotion
              ? undefined
              : {
                  x: orb.x,
                  y: orb.y,
                }
          }
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: orb.duration,
                  delay: orb.delay,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatType: 'mirror',
                  ease: 'easeInOut',
                }
          }
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_12%,rgba(148,163,184,0.06),transparent_34%)]" />
    </div>
  )
}

