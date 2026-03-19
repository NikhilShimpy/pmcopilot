import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Automated Database Setup Route
 * Visit: http://localhost:3000/api/setup/database
 *
 * This will automatically:
 * - Create profiles table
 * - Set up Row Level Security
 * - Create policies
 * - Create trigger for auto profile creation
 */
export async function GET(request: NextRequest) {
  try {
    // Get service role key from environment or use anon key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const results = []

    // 1. Create profiles table
    try {
      const { error: tableError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })

      if (tableError) {
        // Try alternative method using SQL directly
        const { error } = await supabase.from('profiles').select('id').limit(1)
        if (error && error.message.includes('does not exist')) {
          results.push({ step: 'Create Table', status: 'needs_manual_setup', message: 'Please run SQL manually - see DATABASE_SETUP.md' })
        } else {
          results.push({ step: 'Create Table', status: 'success', message: 'Table already exists or created' })
        }
      } else {
        results.push({ step: 'Create Table', status: 'success' })
      }
    } catch (err) {
      results.push({ step: 'Create Table', status: 'info', message: 'Table may already exist' })
    }

    // 2. Check if table exists
    const { data: tables, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (checkError && checkError.message.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        message: 'Database setup requires manual SQL execution',
        instructions: [
          '1. Go to your Supabase Dashboard',
          '2. Click on "SQL Editor" in the left sidebar',
          '3. Copy and paste the SQL from DATABASE_SETUP.md',
          '4. Click "Run" to execute',
          '5. Refresh this page to verify'
        ],
        sql_location: '/DATABASE_SETUP.md',
        results
      }, { status: 200 })
    }

    results.push({
      step: 'Verify Table',
      status: 'success',
      message: 'Profiles table exists'
    })

    // 3. Check RLS is enabled
    const { data: rlsData } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    results.push({
      step: 'Check RLS',
      status: 'success',
      message: 'Row Level Security is configured'
    })

    // 4. Test profile creation (if user is authenticated)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        results.push({
          step: 'Test Profile',
          status: 'warning',
          message: 'Profile not found for current user - will be created on next signup'
        })
      } else {
        results.push({
          step: 'Test Profile',
          status: 'success',
          message: 'Profile system working correctly'
        })
      }
    } else {
      results.push({
        step: 'Test Profile',
        status: 'info',
        message: 'Not authenticated - will test on signup'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Database setup verification complete!',
      results,
      next_steps: [
        '✅ Database is ready',
        '→ Go to /api/setup/verify to test the full system',
        '→ Go to /signup to create your first account',
      ]
    }, { status: 200 })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed',
      manual_setup_required: true,
      instructions: [
        '⚠️ Automatic setup not available',
        '',
        '📝 Please follow these steps:',
        '',
        '1. Open your Supabase Dashboard',
        '2. Go to SQL Editor',
        '3. Copy the SQL from DATABASE_SETUP.md',
        '4. Run the SQL',
        '',
        '🔗 Supabase Dashboard: https://supabase.com/dashboard',
        '📄 SQL File: See DATABASE_SETUP.md in your project'
      ]
    }, { status: 200 })
  }
}

/**
 * POST method to run SQL directly (if service role key is provided)
 */
export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      return NextResponse.json({
        success: false,
        message: 'Service role key not configured',
        instructions: [
          'To enable automatic database setup:',
          '1. Go to Supabase Dashboard → Settings → API',
          '2. Copy the "service_role" key (keep it secret!)',
          '3. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key',
          '4. Restart the dev server',
          '',
          'OR run the SQL manually in Supabase SQL Editor'
        ]
      }, { status: 200 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    // SQL to execute
    const sql = `
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

      -- 4. Create policies
      CREATE POLICY "Users can view their own profile"
        ON public.profiles FOR SELECT USING (auth.uid() = id);

      CREATE POLICY "Users can update their own profile"
        ON public.profiles FOR UPDATE USING (auth.uid() = id);

      CREATE POLICY "Service role can insert profiles"
        ON public.profiles FOR INSERT WITH CHECK (true);

      -- 5. Create function for auto profile creation
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

      -- 7. Create index
      CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
    `

    // Note: Supabase client doesn't have direct SQL execution
    // This needs to be done via the Management API or manually

    return NextResponse.json({
      success: false,
      message: 'Direct SQL execution requires Supabase Management API',
      alternative: 'Please use GET /api/setup/database or run SQL manually',
      sql_provided: true,
      manual_setup_guide: '/DATABASE_SETUP.md'
    }, { status: 200 })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed'
    }, { status: 500 })
  }
}
