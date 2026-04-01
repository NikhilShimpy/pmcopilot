'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Plus,
  Bell,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Command,
  ChevronDown,
  Sparkles,
  Keyboard,
} from 'lucide-react'
import type { Project } from '@/types'
import { useAuth } from '@/hooks/useAuth'

interface PremiumNavbarProps {
  user: {
    id: string
    email?: string | null
  }
  projects: Project[]
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  onCreateProject: () => void
}

export default function PremiumNavbar({
  user,
  projects,
  searchQuery,
  onSearchQueryChange,
  onCreateProject,
}: PremiumNavbarProps) {
  const router = useRouter()
  const { signOut } = useAuth()
  const [showSearch, setShowSearch] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showShortcutHints, setShowShortcutHints] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filteredProjects = searchQuery.trim()
    ? projects.filter((project) => project.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : projects.slice(0, 6)

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
        setTimeout(() => searchInputRef.current?.focus(), 100)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
        setShowUserMenu(false)
        setShowNotifications(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const fetchShortcutPreference = async () => {
      try {
        const response = await fetch('/api/settings')
        const payload = await response.json()
        if (response.ok && payload.success) {
          setShowShortcutHints(payload.data?.shortcut_hints_enabled !== false)
        }
      } catch {
        // Keep default in case preferences are unavailable.
      }
    }

    fetchShortcutPreference()
  }, [])

  const userInitials = user.email?.slice(0, 2).toUpperCase() || 'U'

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
    <>
      <header className="sticky top-0 z-30 h-20
        bg-white/80 dark:bg-gray-900/80
        backdrop-blur-xl
        border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left Section - Search */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl
                bg-gray-100 dark:bg-gray-800
                hover:bg-gray-200 dark:hover:bg-gray-700
                text-gray-500 dark:text-gray-400
                transition-all duration-200 group"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search projects...</span>
              {showShortcutHints && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md
                  bg-gray-200 dark:bg-gray-700
                  text-xs text-gray-500 dark:text-gray-400
                  border border-gray-300 dark:border-gray-600">
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </div>
              )}
            </button>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-3">
            {/* New Project Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCreateProject}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500
                hover:from-blue-600 hover:via-purple-600 hover:to-pink-600
                text-white font-semibold text-sm
                shadow-lg shadow-purple-500/25
                transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
              <Sparkles className="w-4 h-4 opacity-75" />
            </motion.button>

            {/* Notifications */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 rounded-xl
                  bg-gray-100 dark:bg-gray-800
                  hover:bg-gray-200 dark:hover:bg-gray-700
                  text-gray-600 dark:text-gray-400
                  transition-all duration-200"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2.5 h-2.5
                  bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
              </motion.button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-80
                        bg-white dark:bg-gray-800
                        rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-gray-900/50
                        border border-gray-200 dark:border-gray-700
                        overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      </div>
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No new notifications</p>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl
                  bg-gray-100 dark:bg-gray-800
                  hover:bg-gray-200 dark:hover:bg-gray-700
                  transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl
                  bg-gradient-to-br from-blue-500 to-purple-600
                  flex items-center justify-center
                  text-white font-bold text-sm shadow-lg">
                  {userInitials}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </motion.button>

              <AnimatePresence>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-64
                        bg-white dark:bg-gray-800
                        rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-gray-900/50
                        border border-gray-200 dark:border-gray-700
                        overflow-hidden z-50"
                    >
                      {/* User Info */}
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl
                            bg-gradient-to-br from-blue-500 to-purple-600
                            flex items-center justify-center
                            text-white font-bold shadow-lg">
                            {userInitials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {user.email?.split('@')[0] || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        <Link
                          href="/profile"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl
                            text-gray-700 dark:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-700/50
                            transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <span className="text-sm">Profile</span>
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl
                            text-gray-700 dark:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-700/50
                            transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span className="text-sm">Settings</span>
                        </Link>
                        <Link
                          href="/shortcuts"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl
                            text-gray-700 dark:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-700/50
                            transition-colors"
                        >
                          <Keyboard className="w-4 h-4" />
                          <span className="text-sm">Shortcuts</span>
                        </Link>
                        <Link
                          href="/support"
                          className="flex items-center gap-3 px-4 py-3 rounded-xl
                            text-gray-700 dark:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-700/50
                            transition-colors"
                        >
                          <HelpCircle className="w-4 h-4" />
                          <span className="text-sm">Help & Support</span>
                        </Link>
                      </div>

                      {/* Logout */}
                      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          disabled={isSigningOut}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                            text-red-600 dark:text-red-400
                            hover:bg-red-50 dark:hover:bg-red-500/10
                            transition-colors disabled:opacity-50"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="text-sm">{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
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

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowSearch(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50
                w-full max-w-2xl mx-4"
            >
              <div className="bg-white dark:bg-gray-900
                rounded-2xl shadow-2xl shadow-gray-900/20
                border border-gray-200 dark:border-gray-700
                overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder="Search projects, analysis, or ask AI..."
                    className="flex-1 bg-transparent text-gray-900 dark:text-white
                      text-lg placeholder-gray-500 dark:placeholder-gray-400
                      focus:outline-none"
                  />
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg
                    bg-gray-100 dark:bg-gray-800
                    text-xs text-gray-500">
                    <span>ESC</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                    Quick Actions
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setShowSearch(false)
                        onCreateProject()
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl
                        bg-gray-50 dark:bg-gray-800
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        text-gray-700 dark:text-gray-300
                        transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30
                        flex items-center justify-center">
                        <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">New Project</p>
                        <p className="text-xs text-gray-500">Start fresh</p>
                      </div>
                    </button>
                    <button
                      className="flex items-center gap-3 p-3 rounded-xl
                        bg-gray-50 dark:bg-gray-800
                        hover:bg-gray-100 dark:hover:bg-gray-700
                        text-gray-700 dark:text-gray-300
                        transition-colors text-left"
                      onClick={() => {
                        setShowSearch(false)
                        router.push('/analysis')
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30
                        flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">AI Analysis</p>
                        <p className="text-xs text-gray-500">Analyze feedback</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Recent Projects */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                    {searchQuery.trim() ? 'Search Results' : 'Recent Projects'}
                  </p>
                  {filteredProjects.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {filteredProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => {
                            setShowSearch(false)
                            router.push(`/project/${project.id}`)
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{project.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {project.description || 'Open project workspace'}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No projects found for &quot;{searchQuery}&quot;.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
