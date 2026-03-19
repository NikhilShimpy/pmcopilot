'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FolderKanban, Calendar, Users, Sparkles } from 'lucide-react'
import Sidebar from '@/components/dashboard/Sidebar'
import Navbar from '@/components/dashboard/Navbar'
import ProjectCard from '@/components/dashboard/ProjectCard'
import ProjectCardSkeleton from '@/components/dashboard/ProjectCardSkeleton'
import CreateProjectModal from '@/components/dashboard/CreateProjectModal'
import EmptyState from '@/components/dashboard/EmptyState'
import DatabaseSetup from '@/components/dashboard/DatabaseSetup'
import { useProjects } from '@/hooks/useProjects'
import { useToast } from '@/components/ui/Toast'

interface DashboardClientProps {
  user: {
    id: string
    email?: string | null
  }
  profile: unknown
}

export default function DashboardClient({ user, profile }: DashboardClientProps) {
  const { projects, loading, error, needsSetup, fetchProjects, createProject, deleteProject, projectCount } = useProjects()
  const { showToast } = useToast()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleCreateProject = async (name: string, description?: string) => {
    const result = await createProject(name, description)
    if (result.success) {
      showToast('Project created successfully', 'success')
    } else {
      showToast(result.error || 'Failed to create project', 'error')
    }
    return result
  }

  const handleDeleteProject = async (id: string) => {
    const result = await deleteProject(id)
    if (result.success) {
      showToast('Project deleted successfully', 'success')
    } else {
      showToast(result.error || 'Failed to delete project', 'error')
    }
  }

  const stats = [
    {
      label: 'Total Projects',
      value: projectCount,
      icon: FolderKanban,
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
    },
    {
      label: 'Active This Week',
      value: projectCount,
      icon: Calendar,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
    },
    {
      label: 'AI Analyses',
      value: 0,
      icon: Sparkles,
      color: 'purple',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
    },
    {
      label: 'Team Members',
      value: 1,
      icon: Users,
      color: 'orange',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
    },
  ]

  // Show database setup if needed
  if (needsSetup) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar projectCount={0} />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar user={user} onCreateProject={() => {}} />
          <main className="flex-1 p-6 overflow-y-auto">
            <DatabaseSetup onRefresh={fetchProjects} />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar projectCount={projectCount} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <Navbar user={user} onCreateProject={() => setShowCreateModal(true)} />

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Welcome Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Welcome back{(profile as { full_name?: string })?.full_name ? `, ${(profile as { full_name?: string }).full_name}` : ''}!
              </h1>
              <p className="text-gray-500">
                Here&apos;s an overview of your projects and activity.
              </p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                    <div className={`p-3 ${stat.bgColor} rounded-xl`}>
                      <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Projects Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Your Projects</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {projectCount > 0
                      ? `You have ${projectCount} project${projectCount > 1 ? 's' : ''}`
                      : 'Get started by creating your first project'}
                  </p>
                </div>
              </div>

              {/* Error State */}
              {error && !needsSetup && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 mb-6"
                >
                  {error}
                </motion.div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <ProjectCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && projects.length === 0 && (
                <EmptyState onCreateProject={() => setShowCreateModal(true)} />
              )}

              {/* Projects Grid */}
              {!loading && !error && projects.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {projects.map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onDelete={handleDeleteProject}
                      index={index}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateProject}
      />
    </div>
  )
}
