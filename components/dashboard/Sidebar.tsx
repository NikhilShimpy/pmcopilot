'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
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
} from 'lucide-react'

interface SidebarProps {
  projectCount: number
}

export default function Sidebar({ projectCount }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(true) // Start collapsed  const pathname = usePathname()

  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Projects',
      href: '/dashboard',
      icon: FolderKanban,
      badge: projectCount > 0 ? projectCount : null,
    },
    {
      name: 'AI Analysis',
      href: '/dashboard',
      icon: Sparkles,
      badge: null,
      soon: true,
    },
    {
      name: 'Feedback',
      href: '/dashboard',
      icon: MessageSquare,
      badge: null,
      soon: true,
    },
    {
      name: 'Reports',
      href: '/dashboard',
      icon: BarChart3,
      badge: null,
      soon: true,
    },
  ]

  const bottomItems = [
    { name: 'Settings', href: '/dashboard', icon: Settings },
    { name: 'Help', href: '/dashboard', icon: HelpCircle },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      onMouseEnter={() => setCollapsed(false)}
      onMouseLeave={() => setCollapsed(true)}
      className="h-screen bg-gray-900 text-white flex flex-col border-r border-gray-800 sticky top-0 transition-all duration-300"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-lg"
            >
              PMCopilot
            </motion.span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.soon ? '#' : item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
              isActive(item.href) && !item.soon
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            } ${item.soon ? 'cursor-not-allowed opacity-60' : ''}`}
            onClick={item.soon ? (e) => e.preventDefault() : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 font-medium"
              >
                {item.name}
              </motion.span>
            )}
            {!collapsed && item.badge && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-700 rounded-full">
                {item.badge}
              </span>
            )}
            {!collapsed && item.soon && (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-400 rounded-full">
                Soon
              </span>
            )}
            {collapsed && item.badge && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-medium bg-blue-600 rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom Items */}
      <div className="p-3 border-t border-gray-800 space-y-1">
        {bottomItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium"
              >
                {item.name}
              </motion.span>
            )}
          </Link>
        ))}
      </div>
    </motion.aside>
  )
}
