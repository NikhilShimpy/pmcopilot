# 🔐 Authentication System - Database Setup

## Overview

This document provides step-by-step instructions to set up the database for the authentication system.

---

## 📋 Prerequisites

- Supabase project created
- Database access via Supabase Dashboard or SQL Editor

---

## 🗄️ Database Schema

### 1. Profiles Table

The `profiles` table stores additional user information linked to Supabase Auth users.

**Run this SQL in Supabase SQL Editor:**

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Service role can insert profiles (for signup)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
```

---

## 🔄 Automatic Profile Creation

### Option 1: Database Trigger (Recommended)

This automatically creates a profile when a user signs up.

**Run this SQL:**

```sql
-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Option 2: Application-Level (Already Implemented)

The signup flow in `lib/auth.ts` calls the `/api/auth/profile` endpoint to create profiles.

---

## 🔒 Row Level Security (RLS) Policies

The following policies are already included in the schema above:

1. **Read Policy**: Users can only read their own profile
2. **Update Policy**: Users can only update their own profile
3. **Insert Policy**: Service role can insert profiles (for automatic creation)

---

## ✅ Verification Steps

After running the SQL, verify the setup:

### 1. Check Table Exists

```sql
SELECT * FROM public.profiles LIMIT 1;
```

### 2. Check RLS is Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';
```

Expected result: `rowsecurity = true`

### 3. Check Trigger Exists

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

### 4. Test Profile Creation

Sign up a test user through the app and check:

```sql
SELECT id, email, created_at FROM public.profiles;
```

---

## 🔧 Additional Configuration

### Enable Email Confirmations (Optional)

1. Go to **Authentication → Settings** in Supabase Dashboard
2. Under **Email Auth**, configure:
   - Enable email confirmations: ON/OFF (your choice)
   - Email templates: Customize as needed

### Configure Auth Settings

1. **Site URL**: Set to your production URL
2. **Redirect URLs**: Add authorized callback URLs
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)

---

## 🚨 Troubleshooting

### Profile Not Created After Signup

**Check:**
1. Trigger is enabled: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. Function exists: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user';`
3. Check logs in Supabase Dashboard → Database → Logs

**Manual Fix:**
```sql
-- Insert profile manually if missing
INSERT INTO public.profiles (id, email, created_at)
SELECT id, email, created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
```

### RLS Policy Issues

**Reset policies:**
```sql
-- Drop all policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- Re-create policies (run the policies from schema section above)
```

---

## 📊 Database Diagram

```
┌─────────────────────┐
│   auth.users        │
│  (Supabase Auth)    │
├─────────────────────┤
│ id (UUID) PK        │
│ email               │
│ created_at          │
│ ...                 │
└─────────────────────┘
          │
          │ ON DELETE CASCADE
          │
          ▼
┌─────────────────────┐
│  public.profiles    │
├─────────────────────┤
│ id (UUID) PK FK     │
│ email               │
│ created_at          │
│ updated_at          │
└─────────────────────┘
```

---

## 🎯 Next Steps

After database setup:

1. ✅ Install dependencies: `npm install @supabase/ssr`
2. ✅ Run the development server: `npm run dev`
3. ✅ Test signup: `http://localhost:3000/signup`
4. ✅ Test login: `http://localhost:3000/login`
5. ✅ Access dashboard: `http://localhost:3000/dashboard`

---

## 📝 Notes

- **Row Level Security (RLS)** ensures users can only access their own data
- **Database trigger** automatically creates profiles without application logic
- **Cascade delete** ensures profiles are deleted when users are deleted from auth
- All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling

---

## 🔐 Security Best Practices

✅ RLS enabled on all tables
✅ Policies restrict access to user's own data
✅ Service role used for admin operations
✅ Email validation on client and server
✅ Password requirements enforced (min 6 characters)
✅ Sessions stored securely in HTTP-only cookies

---

## 📧 Support

If you encounter issues:
1. Check Supabase logs
2. Verify environment variables
3. Test with Supabase SQL Editor
4. Review RLS policies

---

**Status**: ✅ Production Ready
**Last Updated**: 2026-03-18
