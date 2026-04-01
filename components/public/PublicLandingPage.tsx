'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion, type MotionProps } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  BarChart3,
  BadgeCheck,
  BookOpenCheck,
  BrainCircuit,
  ChartColumnBig,
  ChevronRight,
  Clock3,
  Compass,
  Globe,
  Layers3,
  Menu,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  WandSparkles,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react'
import PublicBackground from './PublicBackground'
import {
  MotionPanel,
  PrimaryLinkButton,
  SectionHeading,
  SecondaryLinkButton,
} from './PublicPrimitives'
import AppLogo from '@/components/shared/AppLogo'

const NAV_ITEMS = [
  { label: 'Features', href: '#features' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Trust', href: '#trust' },
  { label: 'Pricing', href: '#pricing' },
]

const HERO_SIGNALS = [
  { label: 'Sections generated on demand', value: '20' },
  { label: 'Multi-source insight clustering', value: '10+' },
  { label: 'Average first strategy draft', value: '5:42' },
]

const DIFFERENTIATORS: Array<{
  title: string
  description: string
  icon: LucideIcon
}> = [
  {
    title: 'Section-On-Demand Architecture',
    description:
      'Generate strategy sections one at a time so every response stays focused, token-safe, and immediately actionable.',
    icon: Layers3,
  },
  {
    title: 'Gemini-Native Intelligence',
    description:
      'Built around Gemini-first analysis flows for rich product reasoning without relying on paid fallback providers.',
    icon: BrainCircuit,
  },
  {
    title: 'PM-Centric Insight Surfaces',
    description:
      'Capture tradeoffs, risks, effort curves, and roadmap signal in interfaces made for product operators.',
    icon: Compass,
  },
  {
    title: 'Production-Ready Foundation',
    description:
      'Secure auth, typed APIs, and stable routing patterns so teams can adopt immediately without re-architecture.',
    icon: ShieldCheck,
  },
]

const WORKFLOW_STEPS: Array<{
  title: string
  description: string
  icon: LucideIcon
}> = [
  {
    title: 'Ingest Product Context',
    description: 'Bring in user feedback, strategic goals, constraints, and initiative context.',
    icon: Activity,
  },
  {
    title: 'Prioritize Problems',
    description: 'Cluster high-impact opportunities and score urgency with transparent rationale.',
    icon: Target,
  },
  {
    title: 'Generate Section Outputs',
    description: 'Create PRD, feature strategy, timelines, and costs section by section on demand.',
    icon: WandSparkles,
  },
  {
    title: 'Ship With Confidence',
    description: 'Export insights, align teams, and move into execution with auditable decision trails.',
    icon: Rocket,
  },
]

const CAPABILITIES: Array<{
  icon: LucideIcon
  title: string
  description: string
}> = [
  {
    icon: BookOpenCheck,
    title: '20-Section PRD Engine',
    description: 'Structured PRD output with complete section coverage and coherent narrative flow.',
  },
  {
    icon: ChartColumnBig,
    title: 'Problem Analysis Depth',
    description: 'Rich issue mapping with 10+ problem vectors to reduce blind spots early.',
  },
  {
    icon: BarChart3,
    title: 'Feature Opportunity Mapping',
    description: 'Generate and rank 10+ feature options by impact, complexity, and confidence.',
  },
  {
    icon: Clock3,
    title: 'Timeline & Cost Forecast',
    description: 'Translate strategy into practical delivery windows and effort estimation.',
  },
  {
    icon: Workflow,
    title: 'Cross-Section Orchestration',
    description: 'Keep sections connected so changes in one view propagate to decision context.',
  },
  {
    icon: Sparkles,
    title: 'AI Insight Feed',
    description: 'Surface strategic highlights, contradictions, and recommended next actions.',
  },
  {
    icon: Globe,
    title: 'History & Traceability',
    description: 'Track analysis lineage with reusable context and decision audit history.',
  },
  {
    icon: Users,
    title: 'Team-Ready Output',
    description: 'Present concise strategic artifacts for product, design, engineering, and leadership.',
  },
]

const TRUST_METRICS = [
  { label: 'PM teams onboarded', value: '240+' },
  { label: 'Feedback items processed', value: '2.8M' },
  { label: 'Strategy docs generated', value: '98k' },
  { label: 'Avg. time to first insight', value: '< 6 min' },
]

const PRICING = [
  {
    plan: 'Starter',
    price: '$0',
    period: 'forever',
    highlight: false,
    points: [
      'Gemini free-tier routing',
      'Core section-on-demand generation',
      'Basic analysis history',
      'Team-ready exports',
    ],
  },
  {
    plan: 'Growth',
    price: '$39',
    period: 'per workspace / month',
    highlight: true,
    points: [
      'Everything in Starter',
      'Advanced workflow orchestration',
      'Extended history and comparison',
      'Priority product support',
    ],
  },
  {
    plan: 'Scale',
    price: 'Custom',
    period: 'enterprise',
    highlight: false,
    points: [
      'Dedicated onboarding',
      'Security and policy controls',
      'Team governance workflows',
      'Integration planning support',
    ],
  },
]

function BrandMark() {
  return (
    <div className="relative">
      <AppLogo size={40} priority className="rounded-xl" />
      <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-slate-900 bg-emerald-400" />
    </div>
  )
}

export default function PublicLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  const sectionMotion: MotionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 26 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
      }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-slate-950 text-slate-100">
      <PublicBackground variant="landing" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="font-display text-lg font-semibold text-white">PMCopilot</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">AI Product OS</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-slate-300 lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link key={item.label} href={item.href} className="transition-colors hover:text-slate-100">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <SecondaryLinkButton href="/login" className="px-4 py-2">
              Log in
            </SecondaryLinkButton>
            <PrimaryLinkButton href="/signup" className="px-4 py-2">
              Start Free
            </PrimaryLinkButton>
          </div>

          <button
            type="button"
            className="rounded-xl border border-white/10 bg-slate-900/60 p-2 text-slate-100 lg:hidden"
            onClick={() => setMenuOpen((state) => !state)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-white/10 bg-slate-950/95 px-4 py-4 sm:px-6 lg:hidden"
            >
              <div className="space-y-3">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg border border-white/10 bg-slate-900/65 px-3 py-2 text-sm text-slate-200"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <SecondaryLinkButton href="/login" className="w-full">
                    Log in
                  </SecondaryLinkButton>
                  <PrimaryLinkButton href="/signup" className="w-full">
                    Start Free
                  </PrimaryLinkButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-24">
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 28 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={reduceMotion ? undefined : { duration: 0.6, ease: 'easeOut' }}
            className="space-y-8"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/12 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Strategic Intelligence for Product Teams
            </span>

            <div className="space-y-5">
              <h1 className="font-display text-balance text-4xl font-semibold leading-tight text-slate-50 sm:text-5xl lg:text-6xl">
                Build product strategy with a premium{' '}
                <span className="text-gradient-premium">AI command deck</span>.
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
                PMCopilot transforms raw feedback into clear, section-on-demand strategic output:
                problems, features, PRDs, timelines, cost signals, and execution-ready recommendations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <PrimaryLinkButton href="/signup" className="group gap-2">
                Launch Workspace
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </PrimaryLinkButton>
              <SecondaryLinkButton href="/login" className="group gap-1.5">
                Continue to Dashboard
                <ChevronRight className="h-4 w-4 text-cyan-200" />
              </SecondaryLinkButton>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {HERO_SIGNALS.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-2xl border border-white/10 bg-slate-900/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <p className="text-xl font-semibold text-slate-50">{signal.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {signal.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 30 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={reduceMotion ? undefined : { duration: 0.7, delay: 0.1, ease: 'easeOut' }}
            className="relative mx-auto h-[430px] w-full max-w-[560px]"
          >
            <div className="absolute inset-0 rounded-[30px] border border-cyan-300/20 bg-gradient-to-b from-slate-800/55 to-slate-950/85 shadow-[0_65px_130px_-70px_rgba(59,130,246,0.9)]" />
            <div className="absolute inset-4 rounded-[24px] border border-white/10 bg-slate-900/70 p-5 backdrop-blur-xl">
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        duration: 7,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: 'easeInOut',
                      }
                }
                className="relative h-full rounded-[18px] border border-white/10 bg-slate-950/90 p-5"
                style={{ transform: 'perspective(1200px) rotateX(8deg) rotateY(-12deg)' }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live Insight Stack</p>
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                    Active
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
                      <BadgeCheck className="h-3.5 w-3.5 text-cyan-200" />
                      Problem Prioritization
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
                      <BadgeCheck className="h-3.5 w-3.5 text-indigo-200" />
                      Feature Opportunity Scoring
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-500" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-200" />
                      Timeline Confidence
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100">Next AI Recommendation</p>
                  <p className="mt-1 text-sm text-slate-100">
                    Expand onboarding diagnostics section before finalizing Q2 roadmap sequence.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        <motion.section
          id="features"
          className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
          {...sectionMotion}
        >
          <SectionHeading
            kicker="Product Showcase"
            title="One system for context, strategy, and execution signal"
            description="Replace fragmented docs and disconnected tools with a single premium surface where PM teams analyze, prioritize, and publish decisions."
            align="center"
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <MotionPanel className="relative overflow-hidden">
              <div className="absolute -right-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Command Surface</p>
              <h3 className="font-display mt-3 text-2xl font-semibold text-slate-100">
                Strategic cockpit with layered product intelligence
              </h3>
              <p className="mt-3 text-sm text-slate-300">
                Move from signal collection to decision-ready output inside one interface tuned for PM operators.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-slate-100">Problem clusters</p>
                  <p className="mt-1 text-xs text-slate-400">Detect recurring pain patterns and urgency hotspots.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-slate-100">Feature strategy</p>
                  <p className="mt-1 text-xs text-slate-400">Rank solutions by impact, effort, and confidence.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-slate-100">PRD synthesis</p>
                  <p className="mt-1 text-xs text-slate-400">Generate complete structured PRD sections on demand.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-slate-100">Execution forecasts</p>
                  <p className="mt-1 text-xs text-slate-400">Estimate timelines and complexity with transparent assumptions.</p>
                </div>
              </div>
            </MotionPanel>

            <div className="grid gap-5">
              {DIFFERENTIATORS.slice(0, 2).map((item, index) => (
                <MotionPanel
                  key={item.title}
                  initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
                >
                  <div className="mb-3 inline-flex rounded-xl border border-cyan-300/25 bg-cyan-500/12 p-2 text-cyan-100">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                </MotionPanel>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
          {...sectionMotion}
        >
          <SectionHeading
            kicker="Why PMCopilot"
            title="Designed for product teams that need depth without friction"
            description="The platform pairs analytical rigor with premium interaction design, so strategic work feels fast, clear, and collaborative."
            align="center"
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {DIFFERENTIATORS.map((item, index) => (
              <MotionPanel
                key={item.title}
                initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
              >
                <div className="mb-4 inline-flex rounded-xl border border-indigo-300/25 bg-indigo-500/15 p-2 text-indigo-100">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.description}</p>
              </MotionPanel>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="workflow"
          className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
          {...sectionMotion}
        >
          <SectionHeading
            kicker="Workflow"
            title="From feedback noise to execution-ready strategy in four steps"
            description="Each step is built to preserve clarity and momentum, keeping teams aligned from diagnosis through planning."
            align="center"
          />

          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {WORKFLOW_STEPS.map((step, index) => (
              <MotionPanel
                key={step.title}
                initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
                className="relative h-full"
              >
                <span className="absolute right-4 top-4 text-sm font-semibold text-slate-500">
                  0{index + 1}
                </span>
                <div className="mb-4 inline-flex rounded-xl border border-white/15 bg-slate-800/85 p-2 text-cyan-100">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{step.description}</p>
              </MotionPanel>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="capabilities"
          className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
          {...sectionMotion}
        >
          <SectionHeading
            kicker="Advanced Capabilities"
            title="Built to support every major strategic artifact"
            description="Go beyond summaries with structured outputs across PRD generation, feature planning, timeline estimation, and insight history."
            align="center"
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {CAPABILITIES.map((capability, index) => (
              <MotionPanel
                key={capability.title}
                initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
                className="h-full"
              >
                <div className="mb-4 inline-flex rounded-xl border border-cyan-300/25 bg-cyan-500/14 p-2 text-cyan-100">
                  <capability.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-100">{capability.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{capability.description}</p>
              </MotionPanel>
            ))}
          </div>
        </motion.section>

        <motion.section
          id="trust"
          className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
          {...sectionMotion}
        >
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <MotionPanel>
              <SectionHeading
                kicker="Trust & Security"
                title="Operational confidence for every product decision"
                description="PMCopilot is designed for transparent strategic reasoning, secure access flows, and auditable output history."
              />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  'Protected route architecture',
                  'Role-safe workspace access',
                  'Analysis lineage preservation',
                  'Stable App Router implementation',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 text-cyan-200" />
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </MotionPanel>

            <div className="grid gap-4 sm:grid-cols-2">
              {TRUST_METRICS.map((metric) => (
                <MotionPanel key={metric.label} className="h-full">
                  <p className="text-2xl font-semibold text-slate-50">{metric.value}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {metric.label}
                  </p>
                </MotionPanel>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          id="pricing"
          className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"
          {...sectionMotion}
        >
          <SectionHeading
            kicker="Pricing"
            title="Plans for solo PMs to scaled product organizations"
            description="Start free, grow with your workflow, and scale with governance and support as your team matures."
            align="center"
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {PRICING.map((plan) => (
              <MotionPanel
                key={plan.plan}
                className={`h-full ${plan.highlight ? 'border-cyan-300/35 bg-slate-900/80' : ''}`}
              >
                {plan.highlight && (
                  <span className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                    Most Popular
                  </span>
                )}
                <h3 className="font-display text-2xl font-semibold text-slate-100">{plan.plan}</h3>
                <p className="mt-3 text-3xl font-semibold text-white">{plan.price}</p>
                <p className="mt-1 text-sm text-slate-400">{plan.period}</p>
                <ul className="mt-5 space-y-2">
                  {plan.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-slate-300">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  {plan.highlight ? (
                    <PrimaryLinkButton href="/signup" className="w-full">
                      Start with Growth
                    </PrimaryLinkButton>
                  ) : (
                    <SecondaryLinkButton href="/signup" className="w-full">
                      Get Started
                    </SecondaryLinkButton>
                  )}
                </div>
              </MotionPanel>
            ))}
          </div>
        </motion.section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-cyan-300/25 bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-indigo-500/15 p-8 shadow-[0_45px_120px_-65px_rgba(56,189,248,0.85)] sm:p-10 lg:p-12">
            <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-indigo-400/15 blur-3xl" />
            <div className="relative z-10 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Ready to build faster</p>
              <h2 className="font-display mt-4 text-balance text-3xl font-semibold text-slate-50 sm:text-4xl">
                Replace scattered PM tooling with one premium decision engine.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-200 sm:text-base">
                Start free, connect your feedback, and generate strategy sections exactly when your team needs them.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <PrimaryLinkButton href="/signup" className="gap-2">
                  Create Workspace
                  <ArrowRight className="h-4 w-4" />
                </PrimaryLinkButton>
                <SecondaryLinkButton href="/login">Sign In</SecondaryLinkButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div>
                <p className="font-display text-lg font-semibold text-white">PMCopilot</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cursor for Product Managers</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Premium AI operating layer for product teams that need strategic depth, speed, and confidence.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-200">Product</p>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              {NAV_ITEMS.map((item) => (
                <Link key={item.label} href={item.href} className="block transition-colors hover:text-slate-200">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-200">Access</p>
            <div className="mt-3 space-y-2 text-sm text-slate-400">
              <Link href="/signup" className="block transition-colors hover:text-slate-200">
                Create account
              </Link>
              <Link href="/login" className="block transition-colors hover:text-slate-200">
                Log in
              </Link>
              <a href="mailto:support@pmcopilot.ai" className="block transition-colors hover:text-slate-200">
                Contact support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
