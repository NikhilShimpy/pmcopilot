'use client'

import { useEffect, useState } from 'react'
import type { ProfileRecord } from '@/types'

interface UseUserProfileResult {
  profile: ProfileRecord | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useUserProfile(): UseUserProfileResult {
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/profile')
      const payload = await response.json()
      
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to fetch profile')
      }
      
      setProfile(payload.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
  }
}
