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
  CreditCard,
} from 'lucide-react'

interface PremiumSidebarProps {
  analysisCount?: number
}

type NavLinkItem = {
  name: string
  href?: string
  icon: React.ElementType
  gradient?: string
  soon?: boolean
  kind: 'link' | 'action'
  action?: 'theme' | 'collapse'
}

const NAV_ITEMS: NavLinkItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, gradient: 'from-blue-500 to-cyan-500', kind: 'link' },
  { name: 'Projects', href: '/dashboard', icon: FolderKanban, gradient: 'from-violet-500 to-purple-500', kind: 'link' },
  { name: 'AI Analysis', href: '/dashboard', icon: Sparkles, gradient: 'from-amber-500 to-orange-500', kind: 'link' },
  { name: 'Feedback Hub', href: '/dashboard', icon: MessageSquare, gradient: 'from-emerald-500 to-teal-500', soon: true, kind: 'link' },
  { name: 'Reports', href: '/dashboard', icon: BarChart3, gradient: 'from-pink-500 to-rose-500', soon: true, kind: 'link' },
  { name: 'Notifications', href: '/dashboard', icon: Bell, kind: 'link' },
  { name: 'Billing', href: '/dashboard', icon: CreditCard, soon: true, kind: 'link' },
  { name: 'Settings', href: '/dashboard', icon: Settings, kind: 'link' },
  { name: 'Help & Support', href: '/dashboard', icon: HelpCircle, kind: 'link' },
  { name: 'Dark Mode', icon: Moon, kind: 'action', action: 'theme' },
  { name: 'Collapse', icon: ChevronLeft, kind: 'action', action: 'collapse' },
]

export default function PremiumSidebar({ analysisCount = 0 }: PremiumSidebarProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const storedTheme =
      typeof window !== 'undefined' ? window.localStorage.getItem('pmcopilot-theme') : null
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark =
      storedTheme === 'dark' || (!storedTheme && document.documentElement.classList.contains('dark')) || (!storedTheme && prefersDark)

    document.documentElement.classList.toggle('dark', shouldUseDark)
    setIsDark(shouldUseDark)
  }, [])

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
  }

  const isActive = (href: string | undefined, itemName: string) =>
    Boolean(href && pathname === href && itemName === 'Dashboard')

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
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg shadow-purple-500/25">
              <Zap className="w-6 h-6 text-white" />
            </div>
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
          const itemActive = isActive(item.href, item.name)
          const isHovered = hoveredItem === item.name
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
              : item.icon

          const label =
            isThemeAction
              ? isDark
                ? 'Light Mode'
                : 'Dark Mode'
              : isCollapseAction
              ? manuallyCollapsed
                ? 'Expand'
                : 'Collapse'
              : item.name

          const commonClasses = `relative flex items-center py-3 rounded-xl transition-all duration-200 group ${
            item.soon ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
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
              : item.soon
              ? 'bg-gray-800/50'
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
                    <span className={`font-medium truncate ${item.soon ? 'text-gray-500' : ''}`}>{label}</span>
                    {item.soon && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                        Soon
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )

          if (item.kind === 'action') {
            return (
              <button
                key={item.name}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  if (isThemeAction) toggleTheme()
                  if (isCollapseAction) toggleCollapse()
                }}
                className={commonClasses}
              >
                {body}
              </button>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href || '#'}
              onClick={item.soon ? (e) => e.preventDefault() : undefined}
              onMouseEnter={() => setHoveredItem(item.name)}
              onMouseLeave={() => setHoveredItem(null)}
              className={commonClasses}
              title={collapsed && !isHovered ? item.name : undefined}
            >
              {body}
            </Link>
          )
        })}
      </nav>
    </motion.aside>
  )
}
