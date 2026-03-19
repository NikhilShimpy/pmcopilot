'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Copy, Check, ExternalLink, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

const SQL_SCRIPT = `-- =============================================
-- PROJECTS TABLE SETUP FOR PMCOPILOT
-- Run this in Supabase SQL Editor
-- =============================================

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- Create RLS policies
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

-- Success message
SELECT 'Projects table created successfully!' as message;`

interface DatabaseSetupProps {
  onRefresh: () => void
}

export default function DatabaseSetup({ onRefresh }: DatabaseSetupProps) {
  const [copied, setCopied] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null)

  const copySQL = async () => {
    await navigator.clipboard.writeText(SQL_SCRIPT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const verifySetup = async () => {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const response = await fetch('/api/setup/projects-auto')
      const data = await response.json()

      if (data.tableExists) {
        setVerifyResult({ success: true, message: 'Projects table found! Refreshing dashboard...' })
        setTimeout(() => {
          onRefresh()
        }, 1500)
      } else {
        setVerifyResult({
          success: false,
          message: data.error || 'Projects table not found. Please run the SQL script in Supabase SQL Editor first.'
        })
      }
    } catch (error) {
      setVerifyResult({ success: false, message: 'Failed to verify setup. Please try again.' })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Database Setup Required</h2>
              <p className="text-gray-600">
                The projects table needs to be created in your Supabase database
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 space-y-6">
          {/* Alert Box */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">One-time setup required</p>
                <p className="text-sm text-amber-700 mt-1">
                  You need to run a SQL script in your Supabase dashboard to create the projects table.
                  This only needs to be done once.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Follow these steps:</h3>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <span className="text-gray-700">
                  Open your{' '}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Supabase Dashboard
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <span className="text-gray-700">Select your project, then click <strong>SQL Editor</strong> in the left sidebar</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <span className="text-gray-700">Click <strong>New query</strong> (or press Cmd+K / Ctrl+K)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                <span className="text-gray-700">Click the <strong>Copy SQL</strong> button below, then paste it into the query editor</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">5</span>
                <span className="text-gray-700">Click the green <strong>Run</strong> button to execute the script</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">6</span>
                <span className="text-gray-700">Return here and click <strong>Verify Setup</strong> below</span>
              </li>
            </ol>
          </div>

          {/* SQL Script */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">SQL Script</h3>
              <motion.button
                onClick={copySQL}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
              </motion.button>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-xl overflow-x-auto text-sm max-h-64 overflow-y-auto font-mono">
              {SQL_SCRIPT}
            </pre>
          </div>

          {/* Verify Result */}
          {verifyResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl flex items-center gap-3 ${
                verifyResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {verifyResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              )}
              <span className={verifyResult.success ? 'text-green-800' : 'text-red-800'}>
                {verifyResult.message}
              </span>
            </motion.div>
          )}

          {/* Verify Button */}
          <div className="flex justify-center pt-4">
            <motion.button
              onClick={verifySetup}
              disabled={verifying}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium disabled:opacity-50 shadow-lg shadow-blue-500/25"
            >
              <RefreshCw className={`w-5 h-5 ${verifying ? 'animate-spin' : ''}`} />
              {verifying ? 'Verifying...' : "I've run the SQL - Verify Setup"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
