/**
 * CollapsibleSidebar - Auto-expanding sidebar with hover detection
 * Features:
 * - Auto-expand on mouse hover
 * - Smooth Framer Motion animations
 * - Section navigation with active state highlighting
 * - Glassmorphism styling
 */

'use client'

import { useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Briefcase,
  AlertTriangle,
  Layers,
  Target,
  FileText,
  Server,
  CheckSquare,
  Map,
  Users,
  Package,
  IndianRupee,
  Calendar,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Home,
  FolderKanban,
} from 'lucide-react'
import { useChatFirstStore, SECTIONS, SectionId } from '@/stores/chatFirstStore'
import AppLogo from '@/components/shared/AppLogo'

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Briefcase,
  AlertTriangle,
  Layers,
  Target,
  FileText,
  Server,
  CheckSquare,
  Map,
  Users,
  Package,
  IndianRupee,
  Calendar,
  TrendingUp,
}

interface CollapsibleSidebarProps {
  className?: string
}

export function CollapsibleSidebar({ className = '' }: CollapsibleSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const {
    sidebarExpanded,
    sidebarHovered,
    activeSection,
    setSidebarExpanded,
    setSidebarHovered,
    setActiveSection,
    projectName,
  } = useChatFirstStore()

  const isVisible = sidebarExpanded || sidebarHovered

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    // Small delay to prevent accidental triggers
    hoverTimeoutRef.current = setTimeout(() => {
      setSidebarHovered(true)
    }, 100)
  }, [setSidebarHovered])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    // Delay collapse for better UX
    hoverTimeoutRef.current = setTimeout(() => {
      setSidebarHovered(false)
    }, 300)
  }, [setSidebarHovered])

  const handleSectionClick = useCallback((sectionId: SectionId) => {
    setActiveSection(sectionId)
  }, [setActiveSection])

  const togglePinned = useCallback(() => {
    setSidebarExpanded(!sidebarExpanded)
  }, [sidebarExpanded, setSidebarExpanded])

  // Sidebar width animation
  const sidebarVariants = {
    collapsed: {
      width: 64,
      transition: { duration: 0.3, ease: 'easeInOut' as const },
    },
    expanded: {
      width: 280,
      transition: { duration: 0.3, ease: 'easeInOut' as const },
    },
  }

  // Content fade animation
  const contentVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { delay: 0.1, duration: 0.2 } },
  }

  return (
    <motion.aside
      ref={sidebarRef}
      initial="collapsed"
      animate={isVisible ? 'expanded' : 'collapsed'}
      variants={sidebarVariants}
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col
        bg-white/80 dark:bg-gray-900/80
        backdrop-blur-xl
        border-r border-gray-200/50 dark:border-gray-700/50
        shadow-xl shadow-gray-200/20 dark:shadow-gray-900/30
        ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-3 w-full">
          <motion.div
            className="flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AppLogo
              size={32}
              priority
              className="rounded-xl border-white/20 bg-gray-900/80 shadow-lg shadow-cyan-500/30"
            />
          </motion.div>

          <AnimatePresence>
            {isVisible && (
              <motion.div
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="flex-1 min-w-0"
              >
                <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  PMCopilot
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  AI Product OS
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pin/Unpin button */}
          <AnimatePresence>
            {isVisible && (
              <motion.button
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                onClick={togglePinned}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                  text-gray-500 dark:text-gray-400 transition-colors"
                title={sidebarExpanded ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                {sidebarExpanded ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Project Info */}
      {projectName && (
        <div className="px-3 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg
              bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <FolderKanban className="w-4 h-4" />
            </div>
            <AnimatePresence>
              {isVisible && (
                <motion.div
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400">Project</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {projectName}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
        {/* Main Navigation */}
        <div className="space-y-1">
          <NavItem
            icon={Home}
            label="Dashboard"
            href="/dashboard"
            isVisible={isVisible}
          />
          <NavItem
            icon={FolderKanban}
            label="Projects"
            href="/dashboard"
            isVisible={isVisible}
          />
        </div>

        {/* AI Workspace Sections */}
        <AnimatePresence>
          {isVisible && (
            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="mt-6 mb-2 px-2"
            >
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                AI Workspace
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-0.5">
          {SECTIONS.map((section) => {
            const Icon = iconMap[section.icon] || LayoutDashboard
            const isActive = activeSection === section.id

            return (
              <SectionItem
                key={section.id}
                icon={Icon}
                label={section.label}
                description={section.description}
                isActive={isActive}
                isVisible={isVisible}
                onClick={() => handleSectionClick(section.id)}
              />
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50">
        <AnimatePresence>
          {isVisible ? (
            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="text-xs text-gray-400 dark:text-gray-500 text-center"
            >
              Press{' '}
              <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 rounded font-mono">
                Ctrl+K
              </kbd>{' '}
              to focus chat
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <kbd className="px-1.5 py-0.5 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 rounded font-mono">
                K
              </kbd>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}

// Navigation Item Component
interface NavItemProps {
  icon: React.ElementType
  label: string
  href: string
  isVisible: boolean
}

function NavItem({ icon: Icon, label, href, isVisible }: NavItemProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl
        text-gray-600 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-800
        hover:text-gray-900 dark:hover:text-white
        transition-all duration-200"
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <AnimatePresence>
        {isVisible && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="text-sm font-medium"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </a>
  )
}

// Section Item Component
interface SectionItemProps {
  icon: React.ElementType
  label: string
  description: string
  isActive: boolean
  isVisible: boolean
  onClick: () => void
}

function SectionItem({ icon: Icon, label, description, isActive, isVisible, onClick }: SectionItemProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
        transition-all duration-200 text-left
        ${isActive
          ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400 shadow-sm'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
    >
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0
        ${isActive
          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md shadow-blue-500/30'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex-1 min-w-0"
          >
            <p className="text-sm font-medium truncate">{label}</p>
            {isActive && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs text-gray-500 dark:text-gray-400 truncate"
              >
                {description}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="pointer-events-none absolute right-0 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-l-full"
          style={{ position: 'absolute' }}
        />
      )}
    </motion.button>
  )
}

export default CollapsibleSidebar
