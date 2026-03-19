'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Info,
  Database,
  Shield,
  Settings,
  Rocket
} from 'lucide-react'

export default function SetupWizardPage() {
  const [loading, setLoading] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const SQL_SCRIPT = `-- PMCopilot Authentication Database Setup
-- Copy and paste this into Supabase SQL Editor

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- 4. Create security policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT WITH CHECK (true);

-- 5. Create function for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Create index for performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- Done! Close this tab and return to the setup wizard.`

  const runVerification = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/setup/verify')
      const data = await response.json()
      setVerificationResult(data)
    } catch (error) {
      console.error('Verification failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runVerification()
  }, [])

  const copySQL = async () => {
    await navigator.clipboard.writeText(SQL_SCRIPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'fail':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'fail':
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
            <Rocket className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Authentication Setup Wizard
          </h1>
          <p className="text-xl text-gray-600">
            Let&apos;s get your authentication system ready in 3 easy steps
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-6">
          {/* Step 1: Database Setup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Step 1: Database Setup</h2>
                <p className="text-gray-600">Create the profiles table in Supabase</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">SQL Script</h3>
                <button
                  onClick={copySQL}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy SQL
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm max-h-64 overflow-y-auto font-mono">
                {SQL_SCRIPT}
              </pre>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Instructions:</h4>
              <ol className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>Copy the SQL script above</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>
                    Go to{' '}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      Supabase Dashboard
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Click &quot;SQL Editor&quot; in the left sidebar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Paste the SQL and click &quot;Run&quot;</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">5.</span>
                  <span>Click &quot;Re-run Verification&quot; below</span>
                </li>
              </ol>
            </div>
          </motion.div>

          {/* Step 2: Configure Redirect URLs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Step 2: Configure URLs</h2>
                <p className="text-gray-600">Add redirect URLs in Supabase</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Instructions:</h4>
              <ol className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-600">1.</span>
                  <span>
                    Go to{' '}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline inline-flex items-center gap-1"
                    >
                      Supabase Dashboard
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-600">2.</span>
                  <span>Go to Authentication → URL Configuration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-purple-600">3.</span>
                  <span>Add these redirect URLs:</span>
                </li>
              </ol>

              <div className="bg-gray-50 rounded-lg p-4 mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-900">http://localhost:3000/auth/callback</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('http://localhost:3000/auth/callback')
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-900">https://yourdomain.com/auth/callback</code>
                  <span className="text-xs text-gray-500">(for production)</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 3: Verification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Step 3: Verification</h2>
                <p className="text-gray-600">Check if everything is set up correctly</p>
              </div>
            </div>

            <button
              onClick={runVerification}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Running Verification...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Re-run Verification
                </>
              )}
            </button>

            {verificationResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-semibold">Status:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${verificationResult.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : verificationResult.status === 'warning'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                  >
                    {verificationResult.status === 'success'
                      ? '✅ All Systems Ready'
                      : verificationResult.status === 'warning'
                        ? '⚠️ Minor Issues'
                        : '❌ Setup Required'}
                  </span>
                </div>

                <div className="space-y-2">
                  {verificationResult.checks?.map((check: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border ${getStatusColor(check.status)}`}
                    >
                      <div className="flex items-start gap-3">
                        {getStatusIcon(check.status)}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{check.name}</h4>
                          <p className="text-sm text-gray-700 mt-1">{check.message}</p>
                          {check.action && (
                            <p className="text-sm text-gray-600 mt-2 italic">→ {check.action}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {verificationResult.next_steps && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <h4 className="font-semibold text-blue-900 mb-2">Next Steps:</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      {verificationResult.next_steps.map((step: string, index: number) => (
                        <p key={index} className="font-mono">
                          {step}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white"
          >
            <h2 className="text-2xl font-bold mb-4">🎉 Ready to Test?</h2>
            <p className="mb-6 text-indigo-100">
              Once all checks pass, you can start using your authentication system!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/signup"
                className="block p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors text-center"
              >
                <h3 className="font-semibold mb-1">Sign Up</h3>
                <p className="text-sm text-indigo-100">Create your first account</p>
              </a>
              <a
                href="/login"
                className="block p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors text-center"
              >
                <h3 className="font-semibold mb-1">Log In</h3>
                <p className="text-sm text-indigo-100">Test the login flow</p>
              </a>
              <a
                href="/dashboard"
                className="block p-4 bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20 transition-colors text-center"
              >
                <h3 className="font-semibold mb-1">Dashboard</h3>
                <p className="text-sm text-indigo-100">Protected route</p>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
