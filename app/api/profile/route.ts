import { NextRequest } from 'next/server'
import { createServerSupabaseClient, requireServerAuth } from '@/lib/supabase/server'
import { handleError, successResponse } from '@/lib/errorHandler'
import { sanitizeInput } from '@/utils/helpers'

const MAX_BIO_LENGTH = 500

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await requireServerAuth()

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (existingProfile) {
      return successResponse(existingProfile)
    }

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
      })
      .select('*')
      .single()

    if (createError) {
      throw createError
    }

    return successResponse(createdProfile)
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await requireServerAuth()
    const body = await request.json()

    const fullName = body.full_name ? sanitizeInput(body.full_name) : null
    const jobTitle = body.job_title ? sanitizeInput(body.job_title) : null
    const timezone = body.timezone ? sanitizeInput(body.timezone) : null
    const avatarUrl = body.avatar_url ? sanitizeInput(body.avatar_url) : null
    const bio = body.bio ? String(body.bio).trim() : null

    if (bio && bio.length > MAX_BIO_LENGTH) {
      throw new Error(`Bio cannot exceed ${MAX_BIO_LENGTH} characters`)
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email,
          full_name: fullName,
          job_title: jobTitle,
          timezone: timezone || 'UTC',
          avatar_url: avatarUrl,
          bio,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return successResponse(data, 'Profile updated successfully')
  } catch (error) {
    return handleError(error)
  }
}
