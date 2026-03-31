'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import type { Project } from '@/types'

interface UseProjectsReturn {
  projects: Project[]
  loading: boolean
  error: string | null
  needsSetup: boolean
  fetchProjects: () => Promise<void>
  createProject: (name: string, description?: string) => Promise<{ success: boolean; project?: Project; error?: string }>
  deleteProject: (id: string) => Promise<{ success: boolean; error?: string }>
  updateProject: (id: string, name: string, description?: string) => Promise<{ success: boolean; error?: string }>
  projectCount: number
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [needsSetup, setNeedsSetup] = useState(false)

  const isTableNotFoundError = (errorMessage: string) => {
    const lowerMessage = errorMessage.toLowerCase()
    return (
      (lowerMessage.includes('relation') && lowerMessage.includes('does not exist')) ||
      (lowerMessage.includes('could not find') && lowerMessage.includes('projects')) ||
      lowerMessage.includes('schema cache') ||
      lowerMessage.includes('table') && lowerMessage.includes('not found') ||
      lowerMessage.includes('42p01') // PostgreSQL error code for table not found
    )
  }

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setNeedsSetup(false)

      const supabase = createClientSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        if (isTableNotFoundError(fetchError.message)) {
          setNeedsSetup(true)
          setError('Projects table not found. Please run the database setup.')
        } else {
          setError(fetchError.message)
        }
        return
      }

      setProjects(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects'
      if (isTableNotFoundError(errorMessage)) {
        setNeedsSetup(true)
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const createProject = useCallback(async (name: string, description?: string) => {
    try {
      const trimmedName = name.trim()
      if (!trimmedName) {
        return { success: false, error: 'Project name is required' }
      }

      const supabase = createClientSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return { success: false, error: 'Not authenticated' }
      }

      const { data, error: insertError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: trimmedName,
          description: description?.trim() || null,
        })
        .select()
        .single()

      if (insertError) {
        return { success: false, error: insertError.message }
      }

      setProjects(prev => [data, ...prev])
      return { success: true, project: data }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create project' }
    }
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || payload?.success === false) {
        return {
          success: false,
          error:
            payload?.error ||
            payload?.message ||
            `Failed to delete project (status ${response.status})`,
        }
      }

      setProjects(prev => prev.filter(p => p.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete project' }
    }
  }, [])

  const updateProject = useCallback(async (id: string, name: string, description?: string) => {
    try {
      const trimmedName = name.trim()
      if (!trimmedName) {
        return { success: false, error: 'Project name is required' }
      }

      const supabase = createClientSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return { success: false, error: 'Not authenticated' }
      }

      const { data, error: updateError } = await supabase
        .from('projects')
        .update({
          name: trimmedName,
          description: description?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      setProjects(prev => prev.map(p => p.id === id ? data : p))
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update project' }
    }
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return {
    projects,
    loading,
    error,
    needsSetup,
    fetchProjects,
    createProject,
    deleteProject,
    updateProject,
    projectCount: projects.length,
  }
}
