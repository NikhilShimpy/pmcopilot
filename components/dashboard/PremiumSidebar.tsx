'use client'

import { useState, useEffect, useCallback, type MouseEvent } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FolderKanban,
  UserCircle2,
  Settings,
  Keyboard,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Brain,
  MessageSquare,
  BarChart3,
  Moon,
  Sun,
} from 'lucide-react'
import AppLogo from '@/components/shared/AppLogo'

interface PremiumSidebarProps {
  analysisCount?: number
}

type NavLinkItem = {
  name: string
  href: string
  icon: React.ElementType
  gradient?: string
  match?: (pathname: string, hash: string) => boolean
}

const NAV_ITEMS: NavLinkItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    gradient: 'from-blue-500 to-cyan-500',
    match: (path, hash) => path === '/dashboard' && hash !== '#projects-section',
  },
  {
    name: 'Projects',
    href: '/dashboard#projects-section',
    icon: FolderKanban,
    gradient: 'from-violet-500 to-purple-500',
    match: (path, hash) => path.startsWith('/project/') || (path === '/dashboard' && hash === '#projects-section'),
  },
  {
    name: 'AI Analysis',
    href: '/analysis',
    icon: Brain,
    gradient: 'from-amber-500 to-orange-500',
    match: (path) =>
      path === '/analysis' || (path.startsWith('/project/') && path.includes('/analysis')),
  },
  {
    name: 'Feedback Hub',
    href: '/feedback',
    icon: MessageSquare,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: UserCircle2,
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    gradient: 'from-slate-500 to-zinc-500',
  },
  {
    name: 'Shortcuts',
    href: '/shortcuts',
    icon: Keyboard,
    gradient: 'from-cyan-500 to-sky-500',
  },
  {
    name: 'Help & Support',
    href: '/support',
    icon: HelpCircle,
    gradient: 'from-green-500 to-emerald-500',
  },
]

const ACTION_ITEMS = [
  { name: 'Dark Mode', icon: Moon, action: 'theme' as const },
  { name: 'Collapse', icon: ChevronLeft, action: 'collapse' as const },
]

export default function PremiumSidebar({ analysisCount = 0 }: PremiumSidebarProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false)
  const [currentHash, setCurrentHash] = useState('')
  const pathname = usePathname()

  useEffect(() => {
    const storedTheme =
      typeof window !== 'undefined' ? window.localStorage.getItem('pmcopilot-theme') : null
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark =
      storedTheme === 'dark' ||
      (storedTheme === 'system' && prefersDark) ||
      (!storedTheme && document.documentElement.classList.contains('dark')) ||
      (!storedTheme && prefersDark)

    document.documentElement.classList.toggle('dark', shouldUseDark)
    setIsDark(shouldUseDark)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const syncHash = () => setCurrentHash(window.location.hash || '')
    syncHash()
    window.addEventListener('hashchange', syncHash)
    return () => window.removeEventListener('hashchange', syncHash)
  }, [pathname])

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

  const toggleCollapse = () => {
    if (manuallyCollapsed) {
      setManuallyCollapsed(false)
      setCollapsed(!isHovering)
      return
    }
    setManuallyCollapsed(!collapsed)
    setCollapsed(!collapsed)
  }

  const toggleTheme = () => {
    const nextThemeDark = !isDark
    document.documentElement.classList.toggle('dark', nextThemeDark)
    setIsDark(nextThemeDark)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pmcopilot-theme', nextThemeDark ? 'dark' : 'light')
    }
    void fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: nextThemeDark ? 'dark' : 'light' }),
    }).catch(() => {
      // Non-blocking persistence; local preference is already applied.
    })
  }

  const isActive = (item: NavLinkItem) => {
    if (item.match) {
      return item.match(pathname, currentHash)
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  const handleNavClick = (item: NavLinkItem, event: MouseEvent<HTMLAnchorElement>) => {
    if (item.name !== 'Projects') {
      return
    }

    if (pathname !== '/dashboard') {
      return
    }

    event.preventDefault()
    setCurrentHash('#projects-section')
    window.history.replaceState({}, '', '/dashboard#projects-section')
    const target = document.getElementById('projects-section')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const sidebarWidth = collapsed ? 80 : 280

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="h-screen flex flex-col sticky top-0 z-40 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-r border-gray-800/50"
    >
      <div className="h-20 flex items-center px-5 border-b border-gray-800/50">
        <Link href="/dashboard" className="flex items-center gap-4 group">
          <motion.div whileHover={{ scale: 1.05, rotate: 5 }} className="relative">
            <AppLogo
              size={48}
              priority
              className="rounded-2xl border-white/20 bg-gray-900/80 shadow-lg shadow-cyan-500/25"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-gray-900 animate-pulse" />
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
                <span className="font-bold text-xl text-white tracking-tight">PMCopilot</span>
                <span className="text-xs text-gray-500 font-medium">AI Product OS</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-700/70">
        {NAV_ITEMS.map((item) => {
          const itemActive = isActive(item)
          const isHovered = hoveredItem === item.name
          const Icon = item.icon

          const commonClasses = `relative flex items-center py-3 rounded-xl transition-all duration-200 group ${
            'cursor-pointer'
          } ${
            collapsed ? 'justify-center px-2' : 'gap-4 px-4'
          } ${
            itemActive
              ? 'text-white'
              : 'text-gray-300 hover:text-white hover:bg-white/5'
          }`

          const iconContainerClasses = `relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
            itemActive
              ? `bg-gradient-to-br ${item.gradient || 'from-blue-500 to-cyan-500'} shadow-[0_14px_28px_-14px_rgba(56,189,248,0.95)]`
              : 'bg-gray-800/80 group-hover:bg-gray-700/80'
          }`

          const body = (
            <>
              {itemActive && (
                <div className="absolute inset-1 rounded-xl bg-white/[0.08] ring-1 ring-white/10 pointer-events-none" />
              )}
              {itemActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"
                />
              )}
              <div className={`${iconContainerClasses} z-10`}>
                <Icon className={`w-5 h-5 ${itemActive ? 'text-white' : 'text-gray-200 group-hover:text-white'}`} />
                {item.name === 'AI Analysis' && analysisCount > 0 && !collapsed && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500 text-white font-bold">
                    {analysisCount}
                  </span>
                )}
              </div>
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 flex items-center justify-between min-w-0 z-10"
                  >
                    <span className="font-medium truncate">{item.name}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(event) => handleNavClick(item, event)}
              onMouseEnter={() => setHoveredItem(item.name)}
              onMouseLeave={() => setHoveredItem(null)}
              className={commonClasses}
              title={collapsed && !isHovered ? item.name : undefined}
            >
              {body}
            </Link>
          )
        })}

        <div className="pt-3 mt-3 border-t border-gray-800/50 space-y-1">
          {ACTION_ITEMS.map((item) => {
            const isThemeAction = item.action === 'theme'
            const isCollapseAction = item.action === 'collapse'
            const Icon =
              isThemeAction
                ? isDark
                  ? Sun
                  : Moon
                : isCollapseAction
                ? collapsed
                  ? ChevronRight
                  : ChevronLeft
                : ChevronLeft

            const label =
              isThemeAction
                ? isDark
                  ? 'Light Mode'
                  : 'Dark Mode'
                : manuallyCollapsed
                ? 'Expand'
                : 'Collapse'

            return (
              <button
                key={item.name}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  if (isThemeAction) toggleTheme()
                  if (isCollapseAction) toggleCollapse()
                }}
                className={`relative flex items-center py-3 rounded-xl transition-all duration-200 group text-gray-300 hover:text-white hover:bg-white/5 ${
                  collapsed ? 'justify-center px-2' : 'gap-4 px-4'
                }`}
              >
                <div className="relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 bg-gray-800/80 group-hover:bg-gray-700/80">
                  <Icon className="w-5 h-5 text-gray-200 group-hover:text-white" />
                </div>
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 flex items-center justify-between min-w-0 z-10"
                    >
                      <span className="font-medium truncate">{label}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </div>
      </nav>
    </motion.aside>
  )
}
