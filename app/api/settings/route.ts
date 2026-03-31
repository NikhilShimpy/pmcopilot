import { NextRequest } from 'next/server'
import { createServerSupabaseClient, requireServerAuth } from '@/lib/supabase/server'
import { handleError, successResponse } from '@/lib/errorHandler'

const DEFAULT_SETTINGS = {
  theme: 'system',
  shortcut_hints_enabled: true,
  notifications: {
    email: true,
    product: true,
    feedback: true,
    analysis: true,
  },
  dashboard_preferences: {
    compact_mode: false,
    default_project_view: 'grid',
    show_welcome_banner: true,
  },
  ai_preferences: {
    default_output_length: 'long',
    include_cost_estimation: true,
    include_timeline: true,
  },
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await requireServerAuth()

    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (existingSettings) {
      return successResponse(existingSettings)
    }

    const { data: createdSettings, error: createError } = await supabase
      .from('user_settings')
      .insert({
        id: user.id,
        ...DEFAULT_SETTINGS,
      })
      .select('*')
      .single()

    if (createError) {
      throw createError
    }

    return successResponse(createdSettings)
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await requireServerAuth()
    const body = await request.json()

    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    const baseSettings = existingSettings || {
      id: user.id,
      ...DEFAULT_SETTINGS,
    }

    const payload = {
      id: user.id,
      theme:
        body.theme === 'light' || body.theme === 'dark' || body.theme === 'system'
          ? body.theme
          : baseSettings.theme || DEFAULT_SETTINGS.theme,
      shortcut_hints_enabled:
        typeof body.shortcut_hints_enabled === 'boolean'
          ? body.shortcut_hints_enabled
          : baseSettings.shortcut_hints_enabled ?? DEFAULT_SETTINGS.shortcut_hints_enabled,
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(baseSettings.notifications || {}),
        ...(body.notifications || {}),
      },
      dashboard_preferences: {
        ...DEFAULT_SETTINGS.dashboard_preferences,
        ...(baseSettings.dashboard_preferences || {}),
        ...(body.dashboard_preferences || {}),
      },
      ai_preferences: {
        ...DEFAULT_SETTINGS.ai_preferences,
        ...(baseSettings.ai_preferences || {}),
        ...(body.ai_preferences || {}),
      },
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('user_settings')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return successResponse(data, 'Settings updated successfully')
  } catch (error) {
    return handleError(error)
  }
}
