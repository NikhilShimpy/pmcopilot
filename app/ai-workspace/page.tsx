/**
 * Chat-First Page - Main workspace page with ChatGPT-like interface
 */

'use client'

import { Suspense } from 'react'
import { ChatFirstLayout } from '@/components/chat-first'
import { DragDropProvider } from '@/components/chat-first/DragDropContext'

export default function ChatFirstPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DragDropProvider>
        <ChatFirstLayout
          projectName="AI Product Workspace"
        />
      </DragDropProvider>
    </Suspense>
  )
}

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600
          flex items-center justify-center animate-pulse">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">
          Loading PMCopilot...
        </p>
      </div>
    </div>
  )
}
