'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderKanban,
  Calendar,
  Sparkles,
  Target,
  Zap,
  ArrowUpRight,
  Plus,
} from 'lucide-react'
import PremiumSidebar from '@/components/dashboard/PremiumSidebar'
import PremiumNavbar from '@/components/dashboard/PremiumNavbar'
import PremiumProjectCard from '@/components/dashboard/PremiumProjectCard'
import PremiumCreateProjectModal from '@/components/dashboard/PremiumCreateProjectModal'
import DatabaseSetup from '@/components/dashboard/DatabaseSetup'
import { useProjects } from '@/hooks/useProjects'
import { useToast } from '@/components/ui/Toast'
import { DashboardSkeletonGrid } from '@/components/ui/SkeletonLoaders'

interface DashboardClientProps {
  user: {
    id: string
    email?: string | null
  }
  profile: unknown
}

export default function DashboardClient({ user, profile }: DashboardClientProps) {
  const {
    projects,
    loading,
    error,
    needsSetup,
    fetchProjects,
    createProject,
    deleteProject,
    updateProject,
    projectCount,
  } = useProjects()
  const { showToast } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [analytics, setAnalytics] = useState<{
    analyses: number
    feedback: number
    analyzedProjects: number
  } | null>(null)

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects
    const normalized = searchQuery.trim().toLowerCase()
    return projects.filter((project) => project.name.toLowerCase().includes(normalized))
  }, [projects, searchQuery])

  const recentProjectsCount = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return projects.filter((project) => {
      const activityAt = project.updated_at || project.created_at
      return new Date(activityAt).getTime() >= sevenDaysAgo
    }).length
  }, [projects])

  const handleCreateProject = async (name: string, description?: string) => {
    const result = await createProject(name, description)
    if (result.success) {
      showToast('Project created successfully', 'success')
    } else {
      showToast(result.error || 'Failed to create project', 'error')
    }
    return result  // Return the full result including project data
  }

  const handleDeleteProject = async (id: string) => {
    const result = await deleteProject(id)
    if (result.success) {
      showToast('Project deleted successfully', 'success')
    } else {
      showToast(result.error || 'Failed to delete project', 'error')
    }
    return result
  }

  const handleEditProject = async (id: string, name: string, description?: string) => {
    const result = await updateProject(id, name, description)
    if (result.success) {
      showToast('Project updated successfully', 'success')
    } else {
      showToast(result.error || 'Failed to update project', 'error')
    }
    return result
  }

  useEffect(() => {
    const fetchDashboardAnalytics = async () => {
      try {
        const response = await fetch('/api/reports/summary')
        const payload = await response.json()
        if (!response.ok || !payload.success) {
          return
        }
        setAnalytics({
          analyses: payload.data?.totals?.analyses || 0,
          feedback: payload.data?.totals?.feedback || 0,
          analyzedProjects: payload.data?.totals?.analyzed_projects || 0,
        })
      } catch {
        // Silent fallback: dashboard remains usable without aggregate stats.
      }
    }

    fetchDashboardAnalytics()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    if (window.location.hash !== '#projects-section') {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById('projects-section')
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [loading])

  const stats = [
    {
      label: 'Total Projects',
      value: projectCount,
      change:
        recentProjectsCount > 0
          ? `${recentProjectsCount} active in last 7d`
          : 'No activity in last 7d',
      tone: recentProjectsCount > 0 ? 'positive' : 'neutral',
      icon: FolderKanban,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/10 to-cyan-500/10',
    },
    {
      label: 'Active This Week',
      value: recentProjectsCount,
      change: recentProjectsCount > 0 ? 'Recently updated' : 'No recent updates',
      tone: recentProjectsCount > 0 ? 'positive' : 'neutral',
      icon: Calendar,
      gradient: 'from-emerald-500 to-teal-500',
      bgGradient: 'from-emerald-500/10 to-teal-500/10',
    },
    {
      label: 'AI Analyses',
      value: analytics?.analyses || 0,
      change: analytics?.analyzedProjects
        ? `${analytics.analyzedProjects} projects analyzed`
        : 'No analyses yet',
      tone: analytics?.analyzedProjects ? 'positive' : 'neutral',
      icon: Sparkles,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-500/10 to-pink-500/10',
    },
    {
      label: 'Feedback Items',
      value: analytics?.feedback || 0,
      change: analytics?.feedback ? 'Tracking enabled' : 'No feedback yet',
      tone: analytics?.feedback ? 'positive' : 'neutral',
      icon: Target,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-500/10 to-orange-500/10',
    },
  ]

  // Show database setup if needed
  if (needsSetup) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        <PremiumSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <PremiumNavbar
            user={user}
            projects={projects}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onCreateProject={() => {}}
          />
          <main className="flex-1 p-8 overflow-y-auto">
            <DatabaseSetup onRefresh={fetchProjects} />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      {/* Premium Sidebar */}
      <PremiumSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Premium Navbar */}
        <PremiumNavbar
          user={user}
          projects={projects}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onCreateProject={() => setShowCreateModal(true)}
        />

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-10">
            {/* Welcome Header - Premium Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                    Welcome back
                    {(profile as { full_name?: string })?.full_name &&
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                        , {(profile as { full_name?: string }).full_name}
                      </span>
                    }
                    !
                  </h1>
                  <p className="text-lg text-gray-500 dark:text-gray-400">
                    Transform your product ideas into reality with AI-powered insights
                  </p>
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full
                    bg-gradient-to-r from-emerald-500/10 to-teal-500/10
                    border border-emerald-500/20"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    AI Ready
                  </span>
                </motion.div>
              </div>
            </motion.div>

            {/* Stats Grid - Premium Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="relative group overflow-hidden
                    bg-white dark:bg-gray-900
                    rounded-2xl border border-gray-200 dark:border-gray-800
                    p-6 cursor-pointer
                    hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50
                    transition-all duration-300"
                >
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                        bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full
                        ${stat.tone === 'positive'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}>
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {stat.label}
                    </p>
                  </div>

                  {/* Hover Arrow */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileHover={{ opacity: 1, x: 0 }}
                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100
                      transition-all duration-300"
                  >
                    <ArrowUpRight className="w-5 h-5 text-gray-400" />
                  </motion.div>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-[1px]"
            >
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600
                      flex items-center justify-center shadow-lg shadow-purple-500/25">
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Ready to analyze?
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">
                        Create a project and let AI generate comprehensive insights
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl
                      bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500
                      hover:from-blue-600 hover:via-purple-600 hover:to-pink-600
                      text-white font-semibold
                      shadow-lg shadow-purple-500/25
                      transition-all duration-300 whitespace-nowrap"
                  >
                    <Plus className="w-5 h-5" />
                    Create Project
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Projects Section */}
            <section id="projects-section" className="scroll-mt-24">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Projects</h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {filteredProjects.length > 0
                      ? `${filteredProjects.length} project${filteredProjects.length > 1 ? 's' : ''}${searchQuery ? ` matching "${searchQuery}"` : ''}`
                      : 'Get started by creating your first project'}
                  </p>
                </div>
                {projectCount > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl
                      bg-gray-100 dark:bg-gray-800
                      hover:bg-gray-200 dark:hover:bg-gray-700
                      text-gray-700 dark:text-gray-300 font-medium text-sm
                      transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    New Project
                  </motion.button>
                )}
              </div>

              {/* Error State */}
              <AnimatePresence>
                {error && !needsSetup && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                      rounded-xl text-red-600 dark:text-red-400 mb-6"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading State */}
              {loading && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-gray-800 bg-gray-900/80 px-5 py-4">
                    <p className="text-sm text-gray-400">Loading your projects...</p>
                  </div>
                  <DashboardSkeletonGrid count={6} />
                </div>
              )}

              {/* Empty State - Premium */}
              {!loading && !error && projects.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20"
                >
                  <div className="w-24 h-24 mx-auto mb-6 rounded-3xl
                    bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700
                    flex items-center justify-center">
                    <FolderKanban className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    No projects yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Create your first project to start analyzing product ideas, feedback, and generate comprehensive strategies with AI.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-xl
                      bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500
                      text-white font-semibold text-lg
                      shadow-xl shadow-purple-500/25
                      transition-all duration-300"
                  >
                    <Plus className="w-5 h-5" />
                    Create Your First Project
                  </motion.button>
                </motion.div>
              )}

              {!loading && !error && projects.length > 0 && filteredProjects.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700"
                >
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">No matching projects</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Try a different project name in search.
                  </p>
                </motion.div>
              )}

              {/* Projects Grid - Premium Cards */}
              {!loading && !error && filteredProjects.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {filteredProjects.map((project, index) => (
                    <PremiumProjectCard
                      key={project.id}
                      project={project}
                      onDelete={handleDeleteProject}
                      onEdit={handleEditProject}
                      index={index}
                    />
                  ))}
                </motion.div>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* Premium Create Project Modal */}
      <PremiumCreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProject}
      />
    </div>
  )
}
