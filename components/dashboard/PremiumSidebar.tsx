'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MessageSquare,
  BarChart3,
  Zap,
  Bell,
  Moon,
  Sun,
  LogOut,
  CreditCard,
  Shield,
} from 'lucide-react'

interface PremiumSidebarProps {
  projectCount: number
  analysisCount?: number
}

export default function PremiumSidebar({ projectCount, analysisCount = 0 }: PremiumSidebarProps) {
  const [collapsed, setCollapsed] = useState(true) // Start collapsed
  const [isHovering, setIsHovering] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false)
  const pathname = usePathname()

  // Check theme on mount
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  // Handle auto-expand on hover (only if not manually collapsed)
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true)
    if (!manuallyCollapsed) {
      setCollapsed(false)
    }
  }, [manuallyCollapsed])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    if (!manuallyCollapsed) {
      setCollapsed(true)
    }
  }, [manuallyCollapsed])

  // Toggle manual collapse
  const toggleCollapse = () => {
    if (manuallyCollapsed) {
      // If manually collapsed, expand and disable manual mode
      setManuallyCollapsed(false)
      setCollapsed(!isHovering) // Collapse only if not hovering
    } else {
      // Toggle and enable manual mode
      setManuallyCollapsed(!collapsed)
      setCollapsed(!collapsed)
    }
  }

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark')
    setIsDark(!isDark)
  }

  const mainNavItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Projects',
      href: '/dashboard',
      icon: FolderKanban,
      badge: projectCount > 0 ? projectCount : null,
      gradient: 'from-violet-500 to-purple-500',
    },
    {
      name: 'AI Analysis',
      href: '/dashboard',
      icon: Sparkles,
      badge: analysisCount > 0 ? analysisCount : null,
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      name: 'Feedback Hub',
      href: '/dashboard',
      icon: MessageSquare,
      badge: null,
      gradient: 'from-emerald-500 to-teal-500',
      soon: true,
    },
    {
      name: 'Reports',
      href: '/dashboard',
      icon: BarChart3,
      badge: null,
      gradient: 'from-pink-500 to-rose-500',
      soon: true,
    },
  ]

  const bottomItems = [
    { name: 'Notifications', icon: Bell, action: 'notifications' },
    { name: 'Billing', icon: CreditCard, href: '/dashboard', soon: true },
    { name: 'Settings', icon: Settings, href: '/dashboard' },
    { name: 'Help & Support', icon: HelpCircle, href: '/dashboard' },
  ]

  const isActive = (href: string) => pathname === href

  // Sidebar width based on state
  const sidebarWidth = collapsed ? 80 : 280

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="h-screen flex flex-col sticky top-0 z-40
        bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950
        border-r border-gray-800/50"
    >
      {/* Logo Section */}
      <div className="h-20 flex items-center px-5 border-b border-gray-800/50">
        <Link href="/dashboard" className="flex items-center gap-4 group">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="relative"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center
              bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500
              shadow-lg shadow-purple-500/25">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full
              bg-emerald-500 border-2 border-gray-900 animate-pulse" />
          </motion.div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <span className="font-bold text-xl text-white tracking-tight">
                  PMCopilot
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  AI Product OS
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
        {mainNavItems.map((item) => {
          const isItemActive = isActive(item.href) && item.name === 'Dashboard'
          const isHovered = hoveredItem === item.name

          return (
            <Link
              key={item.name}
              href={item.soon ? '#' : item.href}
              onClick={item.soon ? (e) => e.preventDefault() : undefined}
              onMouseEnter={() => setHoveredItem(item.name)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl
                transition-all duration-200 group
                ${item.soon ? 'cursor-not-allowed' : 'cursor-pointer'}
                ${isItemActive
                  ? 'bg-white/10 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
                }
                ${!isItemActive && !item.soon ? 'hover:bg-white/5' : ''}`}
            >
              {/* Active Indicator Bar */}
              {isItemActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full"
                />
              )}

              {/* Icon with gradient background on active */}
              <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center
                flex-shrink-0 transition-all duration-200
                ${isItemActive
                  ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                  : item.soon
                    ? 'bg-gray-800/50'
                    : 'bg-gray-800/80 group-hover:bg-gray-700/80'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isItemActive ? 'text-white' : ''}`} />
              </div>

              {/* Label and Badge */}
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 flex items-center justify-between min-w-0"
                  >
                    <span className={`font-medium truncate
                      ${item.soon ? 'text-gray-500' : ''}`}>
                      {item.name}
                    </span>
                    {item.badge && (
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full
                        ${isItemActive
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-800 text-gray-300'
                        }`}>
                        {item.badge}
                      </span>
                    )}
                    {item.soon && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase
                        bg-gradient-to-r from-violet-500/20 to-purple-500/20
                        text-purple-400 rounded-full border border-purple-500/30">
                        Soon
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Collapsed Badge */}
              {collapsed && item.badge && (
                <span className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold
                  bg-gradient-to-r from-blue-500 to-purple-500
                  text-white rounded-full flex items-center justify-center
                  shadow-lg shadow-purple-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-4 border-t border-gray-800/50 space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.name}
            href={item.href || '#'}
            onClick={item.soon ? (e) => e.preventDefault() : undefined}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl
              text-gray-400 hover:text-white
              transition-all duration-200 group
              ${!item.soon ? 'hover:bg-white/5' : ''}
              ${item.soon ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="w-9 h-9 rounded-lg bg-gray-800/50 flex items-center justify-center
              group-hover:bg-gray-700/80 transition-colors flex-shrink-0">
              <item.icon className="w-4 h-4" />
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="font-medium text-sm"
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        ))}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl
            text-gray-400 hover:text-white hover:bg-white/5
            transition-all duration-200 group"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-800/50 flex items-center justify-center
            group-hover:bg-gray-700/80 transition-colors flex-shrink-0">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="font-medium text-sm"
              >
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl
            text-gray-400 hover:text-white hover:bg-white/5
            transition-all duration-200 group"
        >
          <div className="w-9 h-9 rounded-lg bg-gray-800/50 flex items-center justify-center
            group-hover:bg-gray-700/80 transition-colors flex-shrink-0">
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="font-medium text-sm"
              >
                {manuallyCollapsed ? 'Expand' : 'Collapse'}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Pro Badge (when collapsed) */}
      {collapsed && (
        <div className="px-3 pb-4">
          <div className="w-full h-2 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
        </div>
      )}
    </motion.aside>
  )
}
