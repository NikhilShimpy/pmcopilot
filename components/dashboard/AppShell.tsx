'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle, Keyboard, LogOut, Settings, UserCircle2 } from 'lucide-react'
import PremiumSidebar from './PremiumSidebar'
import { useAuth } from '@/hooks/useAuth'
import AppLogo from '@/components/shared/AppLogo'

interface AppShellProps {
  user: {
    id: string
    email?: string | null
  }
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

export default function AppShell({
  user,
  title,
  description,
  actions,
  children,
}: AppShellProps) {
  const router = useRouter()
  const { signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const initials = useMemo(() => {
    if (!user.email) return 'U'
    return user.email.slice(0, 2).toUpperCase()
  }, [user.email])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const result = await signOut()
    if (result.success) {
      router.push('/login')
      return
    }
    setIsSigningOut(false)
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900">
      <PremiumSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 border-b border-gray-800/80 bg-gray-950/85 backdrop-blur-xl">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="min-w-0 flex items-center gap-3">
              <Link href="/dashboard" className="flex-shrink-0">
                <AppLogo
                  size={38}
                  priority
                  className="rounded-xl border-white/20 bg-gray-900/80"
                />
              </Link>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-white truncate">{title}</h1>
                {description ? (
                  <p className="text-sm text-gray-400 mt-1 truncate">{description}</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {actions}

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl
                    bg-gray-900 border border-gray-800
                    hover:border-gray-700 transition-all"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                    {initials}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-64 z-50 rounded-2xl
                          border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden"
                      >
                        <div className="p-4 border-b border-gray-800">
                          <p className="text-sm font-semibold text-white truncate">
                            {user.email || 'User'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Account</p>
                        </div>
                        <div className="p-2">
                          <Link
                            href="/profile"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-gray-800"
                          >
                            <UserCircle2 className="w-4 h-4" />
                            Profile
                          </Link>
                          <Link
                            href="/settings"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-gray-800"
                          >
                            <Settings className="w-4 h-4" />
                            Settings
                          </Link>
                          <Link
                            href="/shortcuts"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-gray-800"
                          >
                            <Keyboard className="w-4 h-4" />
                            Shortcuts
                          </Link>
                          <Link
                            href="/support"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-200 hover:bg-gray-800"
                          >
                            <HelpCircle className="w-4 h-4" />
                            Help & Support
                          </Link>
                        </div>
                        <div className="p-2 border-t border-gray-800">
                          <button
                            type="button"
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <LogOut className="w-4 h-4" />
                            {isSigningOut ? 'Signing out...' : 'Sign Out'}
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
