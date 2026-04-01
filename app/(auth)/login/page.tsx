'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react'
import AuthShell from '@/components/public/AuthShell'
import { useAuth } from '@/hooks/useAuth'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectedFrom = searchParams.get('redirectedFrom')

  const validateForm = () => {
    if (!email || !password) {
      setError('Email and password are required')
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const result = await signIn(email, password)

      if (!result.success) {
        setError(result.error || 'Login failed')
        return
      }

      const redirectTo = redirectedFrom || '/dashboard'
      router.push(redirectTo)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      mode="login"
      title="Welcome back"
      description="Sign in to resume your workspace and continue generating product strategy with full analysis history."
      footerNote="Protected with encrypted session handling and workspace-level access control."
    >
      {redirectedFrom ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100"
        >
          Please sign in to access <span className="font-semibold text-cyan-50">{redirectedFrom}</span>.
        </motion.div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              disabled={loading}
              className="w-full rounded-xl border border-white/12 bg-slate-950/70 py-3 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-200">
              Password
            </label>
            <a
              href="mailto:support@pmcopilot.ai"
              className="text-xs font-medium text-cyan-200 transition-colors hover:text-cyan-100"
            >
              Need help?
            </a>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
              className="w-full rounded-xl border border-white/12 bg-slate-950/70 py-3 pl-10 pr-11 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-70"
            />
            <button
              type="button"
              onClick={() => setShowPassword((state) => !state)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-900 text-cyan-400 focus:ring-cyan-300/50"
          />
          Keep me signed in on this device
        </label>

        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        ) : null}

        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_24px_50px_-24px_rgba(56,189,248,0.95)] transition-transform disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Continue to workspace
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </motion.button>
      </form>

      <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/55 p-3 text-xs text-slate-400">
        Need access for your team? Contact us at{' '}
        <a className="font-semibold text-cyan-200 hover:text-cyan-100" href="mailto:support@pmcopilot.ai">
          support@pmcopilot.ai
        </a>
        .
      </div>
    </AuthShell>
  )
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading sign-in page...
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
