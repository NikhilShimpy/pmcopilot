'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react'
import AuthShell from '@/components/public/AuthShell'
import { useAuth } from '@/hooks/useAuth'

export default function SignupPage() {
  const router = useRouter()
  const { signUp } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordSignals = useMemo(
    () => [
      {
        label: 'At least 6 characters',
        passed: password.length >= 6,
      },
      {
        label: 'Contains a number',
        passed: /\d/.test(password),
      },
      {
        label: 'Matches confirmation',
        passed: password.length > 0 && password === confirmPassword,
      },
    ],
    [password, confirmPassword]
  )

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
      setError('All fields are required')
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return false
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const result = await signUp(email, password)

      if (!result.success) {
        setError(result.error || 'Signup failed')
        return
      }

      setSuccess(true)
      window.setTimeout(() => {
        router.push('/dashboard')
      }, 1200)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      mode="signup"
      title="Create your workspace"
      description="Join PMCopilot and generate premium product strategy outputs with AI-driven, section-on-demand workflows."
      footerNote="By creating an account, you agree to PMCopilot terms and privacy policy."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
            Work email
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
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
              autoComplete="new-password"
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

        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-200">
            Confirm password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              disabled={loading}
              className="w-full rounded-xl border border-white/12 bg-slate-950/70 py-3 pl-10 pr-11 text-sm text-slate-100 placeholder:text-slate-500 transition-colors focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-70"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((state) => !state)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-200"
              aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">Password checks</p>
          <div className="space-y-2">
            {passwordSignals.map((signal) => (
              <div key={signal.label} className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    signal.passed ? 'bg-emerald-400' : 'bg-slate-600'
                  }`}
                />
                <span className={signal.passed ? 'text-emerald-200' : 'text-slate-400'}>
                  {signal.label}
                </span>
              </div>
            ))}
          </div>
        </div>

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

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-200"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Account created successfully. Redirecting to your dashboard...</span>
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
              Creating account...
            </>
          ) : (
            <>
              Create workspace
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </motion.button>
      </form>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-500/10 p-3 text-xs text-cyan-100">
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        You can start with free-tier Gemini workflows immediately after signup.
      </div>
    </AuthShell>
  )
}

