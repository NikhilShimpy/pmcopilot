#!/usr/bin/env node

/**
 * Automated Setup Script
 * Runs all setup checks and provides guidance
 *
 * Usage: node scripts/setup.js
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function header(message) {
  console.log('\n' + '='.repeat(60))
  log(message, 'bright')
  console.log('='.repeat(60) + '\n')
}

function checkmark() {
  return '✅'
}

function cross() {
  return '❌'
}

function warning() {
  return '⚠️'
}

async function checkEnvironment() {
  header('Checking Environment Variables')

  const envPath = path.join(process.cwd(), '.env.local')

  if (!fs.existsSync(envPath)) {
    log(`${cross()} .env.local file not found`, 'red')
    log('Create .env.local with:', 'yellow')
    log('NEXT_PUBLIC_SUPABASE_URL=your_url', 'cyan')
    log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key', 'cyan')
    return false
  }

  const envContent = fs.readFileSync(envPath, 'utf8')
  const hasUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL')
  const hasKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')

  if (hasUrl && hasKey) {
    log(`${checkmark()} Environment variables configured`, 'green')
    return true
  } else {
    log(`${cross()} Missing required environment variables`, 'red')
    if (!hasUrl) log('  Missing: NEXT_PUBLIC_SUPABASE_URL', 'yellow')
    if (!hasKey) log('  Missing: NEXT_PUBLIC_SUPABASE_ANON_KEY', 'yellow')
    return false
  }
}

async function checkDependencies() {
  header('Checking Dependencies')

  const packageJsonPath = path.join(process.cwd(), 'package.json')

  if (!fs.existsSync(packageJsonPath)) {
    log(`${cross()} package.json not found`, 'red')
    return false
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

  const required = [
    '@supabase/ssr',
    '@supabase/supabase-js',
    'next',
    'react',
    'framer-motion',
    'tailwindcss'
  ]

  let allPresent = true

  for (const dep of required) {
    if (deps[dep]) {
      log(`${checkmark()} ${dep}`, 'green')
    } else {
      log(`${cross()} ${dep} - MISSING`, 'red')
      allPresent = false
    }
  }

  if (!allPresent) {
    log('\nRun: npm install', 'yellow')
  }

  return allPresent
}

async function checkFiles() {
  header('Checking Auth System Files')

  const requiredFiles = [
    'lib/auth.ts',
    'lib/supabase/client.ts',
    'lib/supabase/server.ts',
    'hooks/useAuth.tsx',
    'middleware.ts',
    'app/(auth)/login/page.tsx',
    'app/(auth)/signup/page.tsx',
    'app/dashboard/page.tsx',
    'app/api/auth/profile/route.ts',
    'app/auth/callback/route.ts',
  ]

  let allPresent = true

  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      log(`${checkmark()} ${file}`, 'green')
    } else {
      log(`${cross()} ${file} - MISSING`, 'red')
      allPresent = false
    }
  }

  return allPresent
}

async function runSetup() {
  log('\n🚀 PMCopilot Authentication Setup\n', 'bright')

  const envOk = await checkEnvironment()
  const depsOk = await checkDependencies()
  const filesOk = await checkFiles()

  header('Setup Summary')

  if (envOk && depsOk && filesOk) {
    log(`${checkmark()} All checks passed!`, 'green')
    log('\n📝 Next Steps:\n', 'bright')
    log('1. Run database setup:', 'cyan')
    log('   → Visit: http://localhost:3000/setup', 'blue')
    log('   → Or manually run SQL from DATABASE_SETUP.md\n', 'blue')

    log('2. Configure Supabase redirect URLs:', 'cyan')
    log('   → Go to: https://supabase.com/dashboard', 'blue')
    log('   → Authentication → URL Configuration', 'blue')
    log('   → Add: http://localhost:3000/auth/callback\n', 'blue')

    log('3. Test the system:', 'cyan')
    log('   → npm run dev', 'blue')
    log('   → Visit: http://localhost:3000/signup\n', 'blue')

    log('4. Verify everything works:', 'cyan')
    log('   → Visit: http://localhost:3000/api/setup/verify\n', 'blue')

    log('📚 Documentation:', 'bright')
    log('   → QUICKSTART.md - 5-minute guide', 'blue')
    log('   → AUTH_IMPLEMENTATION.md - Full details', 'blue')
    log('   → DATABASE_SETUP.md - Database help', 'blue')
  } else {
    log(`${cross()} Setup incomplete - fix issues above`, 'red')

    if (!envOk) {
      log('\n→ Fix environment variables first', 'yellow')
    }
    if (!depsOk) {
      log('\n→ Run: npm install', 'yellow')
    }
    if (!filesOk) {
      log('\n→ Some auth files are missing', 'yellow')
    }
  }

  console.log('\n' + '='.repeat(60) + '\n')
}

runSetup().catch(console.error)
