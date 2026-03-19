'use client'

/**
 * PMCopilot - Real-time Feedback Subscription Hook
 *
 * Subscribes to Supabase Realtime for live feedback updates
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Feedback } from '@/services/ingestion.service'

interface UseRealtimeFeedbackOptions {
  projectId: string
  enabled?: boolean
  limit?: number
  onNewFeedback?: (feedback: Feedback) => void
  onAnalysisTriggered?: (analysisId: string) => void
}

interface UseRealtimeFeedbackResult {
  feedbacks: Feedback[]
  isLoading: boolean
  error: string | null
  newCount: number
  clearNewCount: () => void
  refetch: () => Promise<void>
  stats: FeedbackStats
}

interface FeedbackStats {
  total: number
  bySource: Record<string, number>
  last24h: number
  needsAnalysis: boolean
}

export function useRealtimeFeedback({
  projectId,
  enabled = true,
  limit = 50,
  onNewFeedback,
  onAnalysisTriggered,
}: UseRealtimeFeedbackOptions): UseRealtimeFeedbackResult {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newCount, setNewCount] = useState(0)
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0,
    bySource: {},
    last24h: 0,
    needsAnalysis: false,
  })

  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = getSupabaseBrowserClient()

  // Calculate stats from feedbacks
  const calculateStats = useCallback((feedbackList: Feedback[]): FeedbackStats => {
    const bySource: Record<string, number> = {}
    let last24h = 0
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    feedbackList.forEach((f) => {
      bySource[f.source] = (bySource[f.source] || 0) + 1

      const createdAt = new Date(f.created_at)
      if (createdAt >= oneDayAgo) {
        last24h++
      }
    })

    return {
      total: feedbackList.length,
      bySource,
      last24h,
      needsAnalysis: feedbackList.length >= 5,
    }
  }, [])

  // Fetch feedbacks from database
  const fetchFeedbacks = useCallback(async () => {
    if (!projectId) return

    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) {
        throw fetchError
      }

      const feedbackList = (data || []) as Feedback[]
      setFeedbacks(feedbackList)
      setStats(calculateStats(feedbackList))
    } catch (err) {
      console.error('Error fetching feedbacks:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch feedbacks')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, limit, supabase, calculateStats])

  // Clear new count
  const clearNewCount = useCallback(() => {
    setNewCount(0)
  }, [])

  // Subscribe to realtime changes
  useEffect(() => {
    if (!enabled || !projectId) return

    // Initial fetch
    fetchFeedbacks()

    // Set up realtime subscription
    const channel = supabase
      .channel(`feedbacks:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feedbacks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newFeedback = payload.new as Feedback

          // Add to beginning of list
          setFeedbacks((prev) => {
            const updated = [newFeedback, ...prev].slice(0, limit)
            setStats(calculateStats(updated))
            return updated
          })

          // Increment new count
          setNewCount((prev) => prev + 1)

          // Call callback
          if (onNewFeedback) {
            onNewFeedback(newFeedback)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'feedbacks',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const deletedId = (payload.old as any)?.id

          if (deletedId) {
            setFeedbacks((prev) => {
              const updated = prev.filter((f) => f.id !== deletedId)
              setStats(calculateStats(updated))
              return updated
            })
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to feedback updates for project ${projectId}`)
        }
        if (status === 'CHANNEL_ERROR') {
          setError('Failed to connect to real-time updates')
        }
      })

    channelRef.current = channel

    // Also subscribe to analyses table to detect when analysis is triggered
    const analysisChannel = supabase
      .channel(`analyses:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'analyses',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newAnalysis = payload.new as { id: string }
          if (onAnalysisTriggered) {
            onAnalysisTriggered(newAnalysis.id)
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      supabase.removeChannel(analysisChannel)
    }
  }, [enabled, projectId, limit, supabase, fetchFeedbacks, onNewFeedback, onAnalysisTriggered, calculateStats])

  return {
    feedbacks,
    isLoading,
    error,
    newCount,
    clearNewCount,
    refetch: fetchFeedbacks,
    stats,
  }
}

export default useRealtimeFeedback
