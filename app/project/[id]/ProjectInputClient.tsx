'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ElementType } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Edit2,
  FileText,
  Image as ImageIcon,
  Instagram,
  Linkedin,
  Loader2,
  Mic,
  Paperclip,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import type { Project } from '@/types'

type OutputLength = 'short' | 'medium' | 'long' | 'extra-long'
type ImportSourceType = 'text' | 'file' | 'image' | 'audio' | 'whatsapp' | 'linkedin' | 'instagram'
type SocialSource = 'whatsapp' | 'linkedin' | 'instagram'

interface ProjectInputClientProps {
  project: Project
  user: { id: string; email?: string | null }
}

interface ProcessedImport {
  id: string
  source_type: ImportSourceType
  import_method: string
  title: string
  normalized_text: string
  raw_text: string
  file_name?: string | null
  mime_type?: string | null
  created_at: string
}

interface LocalImport extends ProcessedImport {
  editable_text: string
}

const IMPORT_BUCKET = process.env.NEXT_PUBLIC_IMPORTS_BUCKET || 'analysis-imports'
const DOC_ACCEPT = '.txt,.md,.markdown,.pdf,.doc,.docx,.csv,.json,text/plain,text/markdown,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv,application/json'
const IMAGE_ACCEPT = 'image/*'
const AUDIO_ACCEPT = 'audio/*,.mp3,.wav,.m4a,.webm,.ogg'

const OUTPUT_LENGTHS: Array<{ value: OutputLength; label: string }> = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
  { value: 'extra-long', label: 'Extra Long' },
]

const SOCIAL_HELP: Record<SocialSource, { label: string; placeholder: string }> = {
  whatsapp: {
    label: 'WhatsApp',
    placeholder: 'Paste exported WhatsApp chat text or comments here...',
  },
  linkedin: {
    label: 'LinkedIn',
    placeholder: 'Paste LinkedIn post comments, DMs, or thread text here...',
  },
  instagram: {
    label: 'Instagram',
    placeholder: 'Paste Instagram comments/DM snippets or feedback here...',
  },
}

const SOURCE_LABEL: Record<ImportSourceType, string> = {
  text: 'Text',
  file: 'File',
  image: 'Image',
  audio: 'Audio',
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
}

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
  </svg>
)

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read file'))
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

const inferSource = (file: File): ImportSourceType => {
  const mime = (file.type || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  return 'file'
}

const mergeFinalPrompt = (manual: string, imports: LocalImport[]) => {
  const parts: string[] = []
  if (manual.trim()) parts.push(manual.trim())
  for (const item of imports) {
    if (!item.editable_text.trim()) continue
    parts.push(`Source: ${item.title || item.file_name || SOURCE_LABEL[item.source_type]}\n${item.editable_text.trim()}`)
  }
  return parts.join('\n\n')
}

export default function ProjectInputClient({ project: initialProject, user }: ProjectInputClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = useMemo(() => createClientSupabaseClient(), [])

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const socialInputRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const [project, setProject] = useState(initialProject)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(initialProject.name)
  const [savingName, setSavingName] = useState(false)

  const [manualInput, setManualInput] = useState('')
  const [outputLength, setOutputLength] = useState<OutputLength>('long')
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showLengthMenu, setShowLengthMenu] = useState(false)

  const [imports, setImports] = useState<LocalImport[]>([])
  const [processing, setProcessing] = useState(false)
  const [processingLabel, setProcessingLabel] = useState('Processing import...')

  const [finalInput, setFinalInput] = useState('')
  const [finalInputTouched, setFinalInputTouched] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [socialSource, setSocialSource] = useState<SocialSource | null>(null)
  const [socialText, setSocialText] = useState('')
  const [socialFiles, setSocialFiles] = useState<File[]>([])
  const [socialBusy, setSocialBusy] = useState(false)

  const [showRecorder, setShowRecorder] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioBusy, setAudioBusy] = useState(false)

  const mergedPrompt = useMemo(() => mergeFinalPrompt(manualInput, imports), [imports, manualInput])
  const selectedSocial = socialSource ? SOCIAL_HELP[socialSource] : null

  useEffect(() => {
    const timeout = window.setTimeout(() => textareaRef.current?.focus(), 80)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (!finalInputTouched) setFinalInput(mergedPrompt)
  }, [finalInputTouched, mergedPrompt])

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setRecordingSeconds((prev) => prev + 1), 1000)
    return () => window.clearInterval(timer)
  }, [recording])

  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop())
    }
  }, [recordedUrl])

  const addImport = useCallback((item: ProcessedImport) => {
    setImports((prev) => [{ ...item, editable_text: item.normalized_text || item.raw_text || '' }, ...prev])
  }, [])

  const closeRecorderPanel = useCallback(() => {
    if (recorderRef.current && recording) {
      recorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setShowRecorder(false)
    setRecording(false)
    setRecordingSeconds(0)
  }, [recording])

  const saveProjectName = useCallback(async () => {
    if (!editName.trim()) {
      showToast('Project name cannot be empty', 'error')
      return
    }

    setSavingName(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ name: editName.trim(), updated_at: new Date().toISOString() })
        .eq('id', project.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error
      setProject(data)
      setIsEditingName(false)
      showToast('Project updated', 'success')
    } catch {
      showToast('Failed to update project', 'error')
    } finally {
      setSavingName(false)
    }
  }, [editName, project.id, showToast, supabase, user.id])

  const processImportRequest = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/imports/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || body.success === false) {
      throw new Error(body.error || body.message || 'Import processing failed')
    }
    const item = (body?.data?.import || body?.import) as ProcessedImport
    if (!item?.id) throw new Error('Import processing did not return a valid record')
    return item
  }, [])

  const uploadStorage = useCallback(async (file: File): Promise<{ bucket: string; path: string } | null> => {
    try {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const path = `${user.id}/${project.id}/${Date.now()}-${crypto.randomUUID()}.${ext || 'bin'}`
      const { error } = await supabase.storage.from(IMPORT_BUCKET).upload(path, file, {
        upsert: false,
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
      })
      if (error) return null
      return { bucket: IMPORT_BUCKET, path }
    } catch {
      return null
    }
  }, [project.id, supabase, user.id])

  const processFile = useCallback(
    async (file: File, sourceType: ImportSourceType, inputMethod: string, additionalContext = '') => {
      const storage = await uploadStorage(file)
      const base64 = await toBase64(file)
      const item = await processImportRequest({
        project_id: project.id,
        source_type: sourceType,
        input_method: inputMethod,
        file_base64: base64,
        file_name: file.name.slice(0, 200),
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        storage_bucket: storage?.bucket,
        storage_path: storage?.path,
        additional_context: additionalContext,
      })
      addImport(item)
    },
    [addImport, processImportRequest, project.id, uploadStorage]
  )

  const processTextImport = useCallback(
    async (sourceType: ImportSourceType, text: string, title: string, inputMethod: string) => {
      const item = await processImportRequest({
        project_id: project.id,
        source_type: sourceType,
        input_method: inputMethod,
        text,
        file_name: title,
      })
      addImport(item)
    },
    [addImport, processImportRequest, project.id]
  )

  const processFilesBatch = useCallback(
    async (files: File[], forceSource?: ImportSourceType, forceMethod?: string, context = '') => {
      if (files.length === 0) return 0
      let count = 0
      setProcessing(true)
      for (const file of files) {
        const source = forceSource || inferSource(file)
        const method =
          forceMethod ||
          (source === 'image' ? 'screenshot_upload' : source === 'audio' ? 'audio_upload' : 'file_upload')
        try {
          setProcessingLabel(`Processing ${file.name}...`)
          await processFile(file, source, method, context)
          count += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Import failed'
          showToast(`${file.name}: ${message}`, 'error')
        }
      }
      setProcessing(false)
      setProcessingLabel('Processing import...')
      return count
    },
    [processFile, showToast]
  )

  const onDocUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])
      event.target.value = ''
      setShowAttachMenu(false)
      const count = await processFilesBatch(files)
      if (count > 0) showToast(`Imported ${count} file${count > 1 ? 's' : ''}`, 'success')
    },
    [processFilesBatch, showToast]
  )

  const onImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])
      event.target.value = ''
      setShowAttachMenu(false)
      const count = await processFilesBatch(files, 'image', 'screenshot_upload')
      if (count > 0) showToast(`Imported ${count} image${count > 1 ? 's' : ''}`, 'success')
    },
    [processFilesBatch, showToast]
  )

  const onAudioUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || [])
      event.target.value = ''
      setShowAttachMenu(false)
      const count = await processFilesBatch(files, 'audio', 'audio_upload')
      if (count > 0) showToast(`Imported ${count} audio file${count > 1 ? 's' : ''}`, 'success')
    },
    [processFilesBatch, showToast]
  )

  const openSocial = useCallback((source: SocialSource) => {
    setShowAttachMenu(false)
    setSocialSource(source)
    setSocialText('')
    setSocialFiles([])
  }, [])

  const closeSocial = useCallback(() => {
    setSocialSource(null)
    setSocialText('')
    setSocialFiles([])
    setSocialBusy(false)
  }, [])

  const importSocial = useCallback(async () => {
    if (!socialSource) return
    if (!socialText.trim() && socialFiles.length === 0) {
      showToast('Paste text or upload at least one file', 'error')
      return
    }
    setSocialBusy(true)
    let count = 0
    try {
      if (socialText.trim()) {
        await processTextImport(socialSource, socialText.trim(), `${socialSource}-pasted.txt`, 'social_paste')
        count += 1
      }
      if (socialFiles.length > 0) {
        count += await processFilesBatch(socialFiles, socialSource, 'social_upload', `Imported from ${socialSource}`)
      }
      if (count > 0) {
        showToast(`Imported ${count} ${SOCIAL_HELP[socialSource].label} source${count > 1 ? 's' : ''}`, 'success')
        closeSocial()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Social import failed'
      showToast(message, 'error')
    } finally {
      setSocialBusy(false)
    }
  }, [closeSocial, processFilesBatch, processTextImport, showToast, socialFiles, socialSource, socialText])

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('Microphone recording is not supported in this browser', 'error')
      return
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
      setRecordedUrl(null)
    }
    setRecordedBlob(null)
    setRecordingSeconds(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        setRecordedBlob(blob)
        setRecordedUrl(URL.createObjectURL(blob))
        setRecording(false)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }
      recorder.start()
      setRecording(true)
    } catch {
      showToast('Unable to access microphone', 'error')
    }
  }, [recordedUrl, showToast])

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recording) recorderRef.current.stop()
  }, [recording])

  const importRecording = useCallback(async () => {
    if (!recordedBlob) {
      showToast('Please record audio first', 'error')
      return
    }
    setAudioBusy(true)
    try {
      const file = new File([recordedBlob], `recording-${Date.now()}.webm`, { type: recordedBlob.type || 'audio/webm' })
      await processFile(file, 'audio', 'microphone_recording')
      showToast('Recorded audio imported', 'success')
      closeRecorderPanel()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import recording'
      showToast(message, 'error')
    } finally {
      setAudioBusy(false)
    }
  }, [closeRecorderPanel, processFile, recordedBlob, showToast])

  const handleGenerate = useCallback(async () => {
    const payloadText = finalInput.trim()
    if (!payloadText) {
      showToast('Please add input text or imports before generating', 'error')
      return
    }
    setGenerating(true)
    try {
      await supabase
        .from('projects')
        .update({ description: payloadText.slice(0, 2000), updated_at: new Date().toISOString() })
        .eq('id', project.id)
        .eq('user_id', user.id)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: payloadText,
          project_id: project.id,
          detail_level: outputLength,
          reuse_cached: false,
          input_import_ids: imports.map((item) => item.id),
          input_sources: [
            ...(manualInput.trim() ? [{ source_type: 'text', input_method: 'manual_text', label: 'Typed input' }] : []),
            ...imports.map((item) => ({
              source_type: item.source_type,
              input_method: item.import_method,
              label: item.title || item.file_name || SOURCE_LABEL[item.source_type],
              import_id: item.id,
            })),
          ],
          context: {
            project_name: project.name,
            project_context: project.description || '',
          },
        }),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok || body.success === false) {
        throw new Error(body.error || body.message || 'Generation failed')
      }
      const data = body.data || body
      const analysisId = data?.metadata?.session_id || data?.saved_id || data?.metadata?.saved_analysis_id || null
      showToast('Analysis generated successfully', 'success')
      router.push(analysisId ? `/project/${project.id}/output?analysis=${analysisId}` : `/project/${project.id}/output`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      showToast(message, 'error')
      setGenerating(false)
    }
  }, [finalInput, imports, manualInput, outputLength, project.description, project.id, project.name, router, showToast, supabase, user.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !generating) {
        event.preventDefault()
        void handleGenerate()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [generating, handleGenerate])

  const totalChars = finalInput.trim().length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900 text-gray-100">
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-gray-300 hover:border-gray-700 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <div className="h-6 w-px bg-gray-800" />
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input value={editName} onChange={(event) => setEditName(event.target.value)} className="w-56 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={() => void saveProjectName()} disabled={savingName} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{savingName ? 'Saving...' : 'Save'}</button>
                <button onClick={() => { setIsEditingName(false); setEditName(project.name) }} className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-gray-600">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setIsEditingName(true)} className="inline-flex items-center gap-2">
                <span className="text-lg font-semibold text-white">{project.name}</span>
                <Edit2 className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/project/${project.id}/history`} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 hover:border-gray-600">History</Link>
            <Link href={`/project/${project.id}/output`} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 hover:border-gray-600">Latest Output</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl space-y-6 px-6 pb-14 pt-10">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            Multi-source Analysis Composer
          </div>
          <h1 className="mt-4 text-3xl font-bold text-white">Generate new analysis from mixed inputs</h1>
          <p className="mt-2 text-sm text-gray-400">
            Add typed text, files, screenshots, audio, and social content. Review extracted text,
            edit it, then generate a saved analysis session.
          </p>
        </section>

        <section className="rounded-3xl border border-gray-800 bg-gray-900/80">
          <div className="space-y-5 p-6">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Core input
              </label>
              <textarea
                ref={textareaRef}
                value={manualInput}
                onChange={(event) => setManualInput(event.target.value)}
                placeholder="Describe your product idea, user pain points, goals, and constraints..."
                rows={6}
                className="w-full resize-y rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAttachMenu((prev) => !prev)
                    setShowLengthMenu(false)
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-gray-200"
                >
                  <Paperclip className="h-4 w-4" />
                  Attach / Import
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showAttachMenu ? (
                  <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-2xl border border-gray-700 bg-gray-950 p-2 shadow-2xl">
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Upload
                    </p>
                    <MenuAction icon={FileText} label="File Import (txt/md/pdf/docx/csv)" onClick={() => docInputRef.current?.click()} />
                    <MenuAction icon={ImageIcon} label="Image / Screenshot" onClick={() => imageInputRef.current?.click()} />
                    <MenuAction icon={Upload} label="Audio Upload" onClick={() => audioInputRef.current?.click()} />
                    <MenuAction icon={Mic} label="Audio Recording" onClick={() => { setShowAttachMenu(false); setShowRecorder(true) }} />
                    <div className="my-2 h-px bg-gray-800" />
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Import from
                    </p>
                    <MenuAction icon={WhatsAppIcon} label="WhatsApp" onClick={() => openSocial('whatsapp')} />
                    <MenuAction icon={Linkedin} label="LinkedIn" onClick={() => openSocial('linkedin')} />
                    <MenuAction icon={Instagram} label="Instagram" onClick={() => openSocial('instagram')} />
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  onClick={() => {
                    setShowLengthMenu((prev) => !prev)
                    setShowAttachMenu(false)
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-gray-200"
                >
                  Output: {OUTPUT_LENGTHS.find((item) => item.value === outputLength)?.label || 'Long'}
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showLengthMenu ? (
                  <div className="absolute left-0 top-full z-30 mt-2 w-56 rounded-2xl border border-gray-700 bg-gray-950 p-2 shadow-2xl">
                    {OUTPUT_LENGTHS.map((item) => (
                      <button
                        key={item.value}
                        onClick={() => {
                          setOutputLength(item.value)
                          setShowLengthMenu(false)
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                          outputLength === item.value ? 'bg-blue-500/20 text-blue-200' : 'text-gray-200 hover:bg-gray-900'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <button
                onClick={() => {
                  setFinalInput(mergedPrompt)
                  setFinalInputTouched(false)
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-gray-200"
              >
                <RefreshCw className="h-4 w-4" />
                Rebuild Prompt
              </button>

              {processing ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-blue-900/60 bg-blue-950/40 px-3 py-2 text-xs text-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {processingLabel}
                </div>
              ) : null}
            </div>

            <input ref={docInputRef} type="file" accept={DOC_ACCEPT} multiple className="hidden" onChange={(event) => void onDocUpload(event)} />
            <input ref={imageInputRef} type="file" accept={IMAGE_ACCEPT} multiple className="hidden" onChange={(event) => void onImageUpload(event)} />
            <input ref={audioInputRef} type="file" accept={AUDIO_ACCEPT} multiple className="hidden" onChange={(event) => void onAudioUpload(event)} />
          </div>

          <div className="border-t border-gray-800 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Imported content preview</h2>
              <span className="text-xs text-gray-500">{imports.length} import(s)</span>
            </div>
            {imports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-950/60 p-5 text-center text-sm text-gray-400">
                No imports yet. Use Attach / Import to add files, images, audio, or social content.
              </div>
            ) : (
              <div className="space-y-3">
                {imports.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-gray-700 bg-gray-950/70 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{item.title || item.file_name || 'Imported input'}</p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          {SOURCE_LABEL[item.source_type]}{item.mime_type ? ` • ${item.mime_type}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => setImports((prev) => prev.filter((entry) => entry.id !== item.id))}
                        className="rounded-lg border border-red-800/60 bg-red-900/10 px-3 py-1 text-xs text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={item.editable_text}
                      onChange={(event) => {
                        const value = event.target.value
                        setImports((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, editable_text: value } : entry)))
                        setFinalInputTouched(false)
                      }}
                      rows={5}
                      className="w-full resize-y rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-800 p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Final prompt sent to analysis engine</h2>
              <span className="text-xs text-gray-500">{totalChars} chars</span>
            </div>
            <textarea
              value={finalInput}
              onChange={(event) => {
                setFinalInput(event.target.value)
                setFinalInputTouched(true)
              }}
              rows={8}
              className="w-full resize-y rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => void handleGenerate()}
                disabled={generating || processing || socialBusy || audioBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Analysis
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {selectedSocial ? (
          <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{selectedSocial.label} Import</h3>
              <button onClick={closeSocial} className="rounded-lg border border-gray-700 p-1.5 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={socialText}
              onChange={(event) => setSocialText(event.target.value)}
              placeholder={selectedSocial.placeholder}
              rows={6}
              className="w-full resize-y rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={() => socialInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200">
                <Upload className="h-4 w-4" />
                Add Files
              </button>
              <input ref={socialInputRef} type="file" accept={`${DOC_ACCEPT},${IMAGE_ACCEPT}`} multiple className="hidden" onChange={(event) => setSocialFiles(Array.from(event.target.files || []))} />
              {socialFiles.length > 0 ? <span className="text-xs text-gray-400">{socialFiles.length} file(s) selected</span> : null}
              <button onClick={() => void importSocial()} disabled={socialBusy || processing} className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {socialBusy ? 'Importing...' : 'Import to Composer'}
              </button>
            </div>
          </section>
        ) : null}

        {showRecorder ? (
          <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Audio Recording</h3>
              <button onClick={closeRecorderPanel} className="rounded-lg border border-gray-700 p-1.5 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-gray-400">Record your idea, then import transcript-ready audio into composer.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!recording ? (
                <button onClick={() => void startRecording()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Start recording</button>
              ) : (
                <button onClick={stopRecording} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Stop recording
                </button>
              )}
              <span className="rounded-full border border-gray-700 px-2 py-1 text-xs text-gray-300">{Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}</span>
              <button onClick={() => void importRecording()} disabled={!recordedBlob || audioBusy} className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {audioBusy ? 'Importing...' : 'Import Recording'}
              </button>
            </div>
            {recordedUrl ? <audio className="mt-3 w-full" controls src={recordedUrl} /> : null}
          </section>
        ) : null}
      </main>
    </div>
  )
}

function MenuAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ElementType
  label: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-200 hover:bg-gray-900">
      <Icon className="h-4 w-4 text-gray-400" />
      <span>{label}</span>
    </button>
  )
}
