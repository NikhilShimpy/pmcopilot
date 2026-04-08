'use client'

import { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  Loader2,
  Mail,
  Pencil,
  X,
  Camera,
  Calendar,
  Clock,
  Globe,
  Briefcase,
  Sparkles,
  Shield,
  ChevronRight,
} from 'lucide-react'
import PremiumSidebar from '@/components/dashboard/PremiumSidebar'
import { useToast } from '@/components/ui/Toast'
import { AVATAR_OPTIONS } from '@/utils/avatars'
import type { ProfileRecord } from '@/types'

// Static particle positions to avoid hydration mismatch
const PARTICLE_POSITIONS = [
  { x: '5%', y: '10%', opacity: 0.3, duration: 12, delay: 0 },
  { x: '15%', y: '30%', opacity: 0.4, duration: 15, delay: 1 },
  { x: '25%', y: '50%', opacity: 0.25, duration: 18, delay: 2 },
  { x: '35%', y: '70%', opacity: 0.35, duration: 14, delay: 0.5 },
  { x: '45%', y: '20%', opacity: 0.4, duration: 16, delay: 3 },
  { x: '55%', y: '40%', opacity: 0.3, duration: 13, delay: 1.5 },
  { x: '65%', y: '60%', opacity: 0.45, duration: 17, delay: 2.5 },
  { x: '75%', y: '80%', opacity: 0.25, duration: 11, delay: 4 },
  { x: '85%', y: '15%', opacity: 0.35, duration: 19, delay: 0.8 },
  { x: '95%', y: '35%', opacity: 0.3, duration: 14, delay: 3.5 },
  { x: '10%', y: '55%', opacity: 0.4, duration: 16, delay: 2.2 },
  { x: '20%', y: '75%', opacity: 0.3, duration: 12, delay: 1.8 },
  { x: '30%', y: '25%', opacity: 0.35, duration: 15, delay: 4.5 },
  { x: '40%', y: '45%', opacity: 0.25, duration: 18, delay: 0.3 },
  { x: '50%', y: '65%', opacity: 0.4, duration: 13, delay: 2.8 },
  { x: '60%', y: '85%', opacity: 0.3, duration: 17, delay: 1.2 },
  { x: '70%', y: '5%', opacity: 0.35, duration: 14, delay: 3.8 },
  { x: '80%', y: '95%', opacity: 0.45, duration: 11, delay: 0.6 },
  { x: '90%', y: '50%', opacity: 0.3, duration: 16, delay: 2.4 },
  { x: '3%', y: '90%', opacity: 0.35, duration: 15, delay: 4.2 },
]

interface ProfileClientProps {
  user: {
    id: string
    email?: string | null
  }
  initialProfile: ProfileRecord | null
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function ProfileClient({ user, initialProfile }: ProfileClientProps) {
  const { showToast } = useToast()
  const [mode, setMode] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Saved profile state (what's in DB)
  const [savedProfile, setSavedProfile] = useState({
    full_name: initialProfile?.full_name || '',
    job_title: initialProfile?.job_title || '',
    timezone: initialProfile?.timezone || 'UTC',
    avatar_url: initialProfile?.avatar_url || '',
    bio: initialProfile?.bio || '',
  })
  
  // Form state (for editing)
  const [form, setForm] = useState({ ...savedProfile })

  const initials = useMemo(() => {
    const name = mode === 'EDIT' ? form.full_name : savedProfile.full_name
    if (name?.trim()) {
      return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    }
    return user.email?.slice(0, 2).toUpperCase() || 'U'
  }, [form.full_name, savedProfile.full_name, user.email, mode])

  const displayName = savedProfile.full_name || user.email?.split('@')[0] || 'User'
  const displayAvatar = mode === 'EDIT' ? form.avatar_url : savedProfile.avatar_url

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      showToast('Name cannot be empty', 'error')
      return
    }
    
    setSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to save profile')
      }

      setSavedProfile({ ...form })
      setMode('VIEW')
      showToast('Profile updated successfully! 🎉', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = useCallback(() => {
    setForm({ ...savedProfile })
    setMode('VIEW')
    setShowAvatarPicker(false)
  }, [savedProfile])

  const handleAvatarSelect = (avatar: string) => {
    setForm((prev) => ({ ...prev, avatar_url: avatar }))
    setShowAvatarPicker(false)
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900">
      <PremiumSidebar />
      
      <div className="flex-1 min-w-0 relative">
        {/* Hero Banner */}
        <div className="h-56 md:h-64 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-pink-600/30" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
          
          {/* Animated particles - using fixed positions to avoid hydration mismatch */}
          <div className="absolute inset-0 overflow-hidden">
            {PARTICLE_POSITIONS.map((particle, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full"
                style={{ 
                  left: particle.x,
                  top: particle.y,
                }}
                animate={{ 
                  y: [0, -200],
                  opacity: [particle.opacity, 0]
                }}
                transition={{ 
                  duration: particle.duration,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: particle.delay,
                }}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 -mt-32 relative z-10 pb-12">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900/90 backdrop-blur-xl border border-gray-800/80 rounded-3xl shadow-2xl shadow-black/20 overflow-hidden"
          >
            {/* Header Section */}
            <div className="p-8 md:p-10 border-b border-gray-800/50">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
                {/* Avatar with Edit Overlay */}
                <div className="relative group">
                  <motion.div 
                    className="relative"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <div className="w-36 h-36 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-2xl shadow-purple-500/30">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gray-900 border-4 border-gray-900">
                        {displayAvatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={displayAvatar}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                            {initials}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Camera Button */}
                    <motion.button
                      onClick={() => setShowAvatarPicker(true)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center transition-colors"
                    >
                      <Camera className="w-5 h-5" />
                    </motion.button>
                  </motion.div>
                  
                  {mode === 'EDIT' && displayAvatar !== savedProfile.avatar_url && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -top-1 -right-1 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full shadow-lg"
                    >
                      NEW
                    </motion.div>
                  )}
                </div>

                {/* Name & Title */}
                <div className="flex-1 text-center md:text-left">
                  <AnimatePresence mode="wait">
                    {mode === 'VIEW' ? (
                      <motion.div
                        key="view"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                          {displayName}
                        </h1>
                        <p className="text-lg text-gray-400 flex items-center justify-center md:justify-start gap-2">
                          <Briefcase className="w-4 h-4" />
                          {savedProfile.job_title || 'Product Builder'}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 flex items-center justify-center md:justify-start gap-2">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="edit"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-3"
                      >
                        <input
                          type="text"
                          value={form.full_name}
                          onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                          className="w-full md:max-w-sm px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-2xl text-white font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          placeholder="Your name"
                          maxLength={120}
                        />
                        <input
                          type="text"
                          value={form.job_title}
                          onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))}
                          className="w-full md:max-w-sm px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          placeholder="Job title"
                          maxLength={120}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <AnimatePresence mode="wait">
                    {mode === 'VIEW' ? (
                      <motion.button
                        key="edit-btn"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => setMode('EDIT')}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit Profile
                      </motion.button>
                    ) : (
                      <motion.div
                        key="save-btns"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex gap-3"
                      >
                        <motion.button
                          onClick={handleSave}
                          disabled={saving}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-60"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          {saving ? 'Saving...' : 'Save Changes'}
                        </motion.button>
                        <motion.button
                          onClick={handleCancel}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium border border-gray-700 transition-all"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-8 md:p-10">
              <AnimatePresence mode="wait">
                {mode === 'VIEW' ? (
                  <motion.div
                    key="view-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    {/* Bio Section */}
                    {savedProfile.bio && (
                      <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-800/50">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">About</h3>
                        <p className="text-gray-200 leading-relaxed">{savedProfile.bio}</p>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-6 rounded-2xl cursor-default"
                      >
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                          <Calendar className="w-6 h-6 text-blue-400" />
                        </div>
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Member Since</p>
                        <p className="text-lg font-semibold text-white">{formatDate(initialProfile?.created_at)}</p>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-6 rounded-2xl cursor-default"
                      >
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                          <Globe className="w-6 h-6 text-purple-400" />
                        </div>
                        <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Timezone</p>
                        <p className="text-lg font-semibold text-white">{savedProfile.timezone}</p>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6 rounded-2xl cursor-default"
                      >
                        <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
                          <Shield className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Account Status</p>
                        <p className="text-lg font-semibold text-white flex items-center gap-2">
                          Active
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        </p>
                      </motion.div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowAvatarPicker(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-300 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        Change Avatar
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setMode('EDIT')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-300 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit Details
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="edit-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Edit Form */}
                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Timezone
                        </span>
                        <input
                          value={form.timezone}
                          onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          placeholder="Asia/Kolkata"
                          maxLength={80}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
                          <Camera className="w-4 h-4" />
                          Custom Avatar URL
                        </span>
                        <input
                          value={form.avatar_url}
                          onChange={(e) => setForm((prev) => ({ ...prev, avatar_url: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                          placeholder="https://... (or use avatar picker)"
                          maxLength={400}
                        />
                      </label>
                    </div>

                    <label className="space-y-2 block">
                      <span className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Bio
                      </span>
                      <textarea
                        value={form.bio}
                        onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                        rows={4}
                        maxLength={500}
                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                        placeholder="Tell us about yourself and what you're building..."
                      />
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Share what makes you unique</span>
                        <span className={`${form.bio.length > 450 ? 'text-amber-400' : 'text-gray-500'}`}>
                          {form.bio.length}/500
                        </span>
                      </div>
                    </label>

                    {/* Avatar Selection Button */}
                    <motion.button
                      onClick={() => setShowAvatarPicker(true)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 hover:border-blue-500/50 rounded-xl flex items-center justify-between transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <Camera className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">Choose from Avatar Gallery</p>
                          <p className="text-xs text-gray-400">Select from our collection of premium avatars</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <AnimatePresence>
        {showAvatarPicker && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAvatarPicker(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-lg max-h-[90vh] pointer-events-auto"
              >
                <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Choose Avatar</h2>
                    <p className="text-sm text-gray-400 mt-1">Select your profile picture</p>
                  </div>
                  <motion.button
                    onClick={() => setShowAvatarPicker(false)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Avatar Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-3 gap-4">
                    {AVATAR_OPTIONS.map((avatar, idx) => {
                      const isSelected = form.avatar_url === avatar
                      return (
                        <motion.button
                          key={idx}
                          onClick={() => handleAvatarSelect(avatar)}
                          whileHover={{ scale: 1.05, y: -4 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative aspect-square rounded-2xl overflow-hidden border-3 transition-all ${
                            isSelected
                              ? 'border-blue-500 ring-4 ring-blue-500/30 shadow-lg shadow-blue-500/20'
                              : 'border-gray-700 hover:border-gray-500'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={avatar}
                            alt={`Avatar ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Hover Overlay */}
                          <div className={`absolute inset-0 transition-opacity ${isSelected ? 'bg-blue-500/30' : 'bg-black/0 hover:bg-black/20'}`} />
                          
                          {/* Selected Check */}
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                <Check className="w-6 h-6 text-white" />
                              </div>
                            </motion.div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-gray-900/80">
                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => setShowAvatarPicker(false)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      onClick={() => {
                        setShowAvatarPicker(false)
                        if (mode === 'VIEW') setMode('EDIT')
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-all"
                    >
                      Apply Avatar
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
