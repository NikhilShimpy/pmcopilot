'use client'

/**
 * PMCopilot - Integrations Panel Component
 *
 * Connect and manage feedback integrations
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Slack,
  Webhook,
  MessageSquare,
  Plus,
  Check,
  Loader2,
  ExternalLink,
  Copy,
  ChevronDown,
  Settings,
  RefreshCw,
  Link2,
  Link2Off,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'

interface IntegrationsPanelProps {
  projectId: string
  onIntegrationSuccess?: () => void
}

interface Integration {
  id: string
  name: string
  description: string
  icon: typeof Mail
  color: string
  bg: string
  status: 'connected' | 'disconnected' | 'connecting'
  isSimulated?: boolean
}

export default function IntegrationsPanel({
  projectId,
  onIntegrationSuccess,
}: IntegrationsPanelProps) {
  const { showToast } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [loadingIntegration, setLoadingIntegration] = useState<string | null>(null)
  const [showWebhookInfo, setShowWebhookInfo] = useState(false)

  const [integrations] = useState<Integration[]>([
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Import feedback from email conversations',
      icon: Mail,
      color: 'text-red-600',
      bg: 'bg-red-100',
      status: 'disconnected',
      isSimulated: true,
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Collect feedback from Slack channels',
      icon: Slack,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      status: 'disconnected',
      isSimulated: true,
    },
    {
      id: 'intercom',
      name: 'Intercom',
      description: 'Sync customer conversations',
      icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      status: 'disconnected',
      isSimulated: true,
    },
    {
      id: 'webhook',
      name: 'Custom Webhook',
      description: 'Connect any external source via API',
      icon: Webhook,
      color: 'text-green-600',
      bg: 'bg-green-100',
      status: 'connected',
    },
  ])

  const handleConnect = async (integrationId: string) => {
    setLoadingIntegration(integrationId)

    try {
      // Simulate loading
      await new Promise((resolve) => setTimeout(resolve, 1000))

      let endpoint = ''
      const method = 'GET'

      switch (integrationId) {
        case 'gmail':
          endpoint = `/api/integrations/gmail?project_id=${projectId}`
          break
        case 'slack':
          endpoint = `/api/integrations/slack?project_id=${projectId}`
          break
        case 'webhook':
          setShowWebhookInfo(true)
          setLoadingIntegration(null)
          return
        default:
          showToast(`${integrationId} integration is coming soon!`, 'info')
          setLoadingIntegration(null)
          return
      }

      const response = await fetch(endpoint, { method })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to connect')
      }

      showToast(
        `Successfully imported ${data.data?.ingested || 0} items from ${integrationId}`,
        'success'
      )

      if (onIntegrationSuccess) {
        onIntegrationSuccess()
      }
    } catch (error) {
      console.error(`Error connecting ${integrationId}:`, error)
      showToast(
        error instanceof Error ? error.message : `Failed to connect ${integrationId}`,
        'error'
      )
    } finally {
      setLoadingIntegration(null)
    }
  }

  const copyWebhookUrl = () => {
    const webhookUrl = `${window.location.origin}/api/webhook/feedback`
    navigator.clipboard.writeText(webhookUrl)
    showToast('Webhook URL copied to clipboard', 'success')
  }

  const webhookExample = `curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/webhook/feedback \\
  -H "Content-Type: application/json" \\
  -d '{
    "project_id": "${projectId}",
    "content": "User feedback message here",
    "source": "webhook",
    "metadata": {
      "user_id": "optional-user-id"
    }
  }'`

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Link2 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Integrations</h3>
            <p className="text-xs text-gray-500">
              Connect feedback sources
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {integrations.slice(0, 3).map((integration) => (
              <div
                key={integration.id}
                className={`w-6 h-6 rounded-full ${integration.bg} flex items-center justify-center ring-2 ring-white`}
              >
                <integration.icon className={`w-3 h-3 ${integration.color}`} />
              </div>
            ))}
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Integration List */}
            <div className="p-4 space-y-3">
              {integrations.map((integration, index) => (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${integration.bg}`}>
                      <integration.icon className={`w-5 h-5 ${integration.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">
                          {integration.name}
                        </span>
                        {integration.isSimulated && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-yellow-100 text-yellow-700 rounded">
                            Demo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{integration.description}</p>
                    </div>
                  </div>

                  <motion.button
                    onClick={() => handleConnect(integration.id)}
                    disabled={loadingIntegration === integration.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      integration.status === 'connected'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : integration.id === 'webhook'
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {loadingIntegration === integration.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting
                      </>
                    ) : integration.status === 'connected' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Connected
                      </>
                    ) : integration.id === 'webhook' ? (
                      <>
                        <Settings className="w-4 h-4" />
                        Configure
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Import
                      </>
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </div>

            {/* Webhook Info Modal */}
            <AnimatePresence>
              {showWebhookInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4"
                >
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        Webhook Configuration
                      </h4>
                      <button
                        onClick={() => setShowWebhookInfo(false)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Link2Off className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>

                    {/* Endpoint URL */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Endpoint URL
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs text-gray-700 break-all">
                          {typeof window !== 'undefined'
                            ? `${window.location.origin}/api/webhook/feedback`
                            : '/api/webhook/feedback'}
                        </code>
                        <button
                          onClick={copyWebhookUrl}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* Method */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Method
                      </label>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        POST
                      </span>
                    </div>

                    {/* Example */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Example Request
                      </label>
                      <pre className="p-3 bg-gray-900 rounded-lg text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                        {webhookExample}
                      </pre>
                    </div>

                    {/* Test Button */}
                    <div className="mt-3 flex justify-end">
                      <a
                        href={`/api/webhook/feedback`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View API Docs
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Import */}
            <div className="px-4 pb-4">
              <motion.button
                onClick={() => {
                  handleConnect('gmail')
                  setTimeout(() => handleConnect('slack'), 2000)
                }}
                disabled={loadingIntegration !== null}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
              >
                {loadingIntegration ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Import All Demo Data
                  </>
                )}
              </motion.button>
              <p className="text-xs text-gray-400 text-center mt-2">
                Imports sample feedback from Gmail and Slack
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
