/**
 * Chat Store - Manages chat state with robust error handling
 * Handles messages, streaming status, retry logic, and dropped items
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ChatMessage, ChatStatus, DraggableItem, ChatContext } from '@/types/workspace'

interface ChatState {
  messages: ChatMessage[]
  status: ChatStatus
  error: string | null
  inputValue: string
  droppedItems: DraggableItem[]
  lastUserMessage: string | null
  abortController: AbortController | null
  streamTimeout: number
}

interface ChatActions {
  // Message management
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, content: string) => void
  removeMessage: (id: string) => void
  clearMessages: () => void

  // Streaming control
  startStreaming: (messageId: string) => void
  finishStreaming: (messageId: string) => void
  appendToStream: (messageId: string, content: string) => void

  // Status management
  setStatus: (status: ChatStatus) => void
  setError: (error: string | null) => void
  clearError: () => void

  // Input management
  setInputValue: (value: string) => void
  clearInput: () => void

  // Dropped items
  addDroppedItem: (item: DraggableItem) => void
  removeDroppedItem: (itemId: string) => void
  clearDroppedItems: () => void
  generateQueryFromDroppedItem: (item: DraggableItem) => string

  // Abort control
  setAbortController: (controller: AbortController | null) => void
  abort: () => void

  // Retry
  setLastUserMessage: (message: string | null) => void
  prepareRetry: () => string | null

  // Timeout
  setStreamTimeout: (ms: number) => void

  // Reset
  reset: () => void
}

type ChatStore = ChatState & ChatActions

const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `**Welcome to PMCopilot AI Assistant!**

I've analyzed your feedback and I'm ready to help. Here's what you can do:

**Ask Questions:**
- "Why is this feature high priority?"
- "Show me evidence for problem X"
- "What should I build first?"

**Drag & Drop:**
- Drag any **problem**, **feature**, or **task** into this chat
- I'll provide detailed analysis instantly

**Quick Actions:**
- Click the suggested prompts above
- Or type your own question

*Tip: Press Cmd/Ctrl + K to focus chat from anywhere*`,
  timestamp: new Date(),
}

const initialState: ChatState = {
  messages: [WELCOME_MESSAGE],
  status: 'idle',
  error: null,
  inputValue: '',
  droppedItems: [],
  lastUserMessage: null,
  abortController: null,
  streamTimeout: 60000, // 60 seconds - increased for longer responses
}

export const useChatStore = create<ChatStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Message management
      addMessage: (message) => {
        const id = generateMessageId()
        const newMessage: ChatMessage = {
          ...message,
          id,
          timestamp: new Date(),
        }
        set(
          (state) => ({ messages: [...state.messages, newMessage] }),
          false,
          'addMessage'
        )
        return id
      },

      updateMessage: (id, content) =>
        set(
          (state) => ({
            messages: state.messages.map((msg) =>
              msg.id === id ? { ...msg, content } : msg
            ),
          }),
          false,
          'updateMessage'
        ),

      removeMessage: (id) =>
        set(
          (state) => ({
            messages: state.messages.filter((msg) => msg.id !== id),
          }),
          false,
          'removeMessage'
        ),

      clearMessages: () =>
        set({ messages: [WELCOME_MESSAGE] }, false, 'clearMessages'),

      // Streaming control
      startStreaming: (messageId) =>
        set(
          (state) => ({
            status: 'streaming',
            messages: state.messages.map((msg) =>
              msg.id === messageId ? { ...msg, isStreaming: true } : msg
            ),
          }),
          false,
          'startStreaming'
        ),

      finishStreaming: (messageId) =>
        set(
          (state) => ({
            status: 'idle',
            messages: state.messages.map((msg) =>
              msg.id === messageId ? { ...msg, isStreaming: false } : msg
            ),
          }),
          false,
          'finishStreaming'
        ),

      appendToStream: (messageId, content) =>
        set(
          (state) => ({
            messages: state.messages.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: msg.content + content }
                : msg
            ),
          }),
          false,
          'appendToStream'
        ),

      // Status management
      setStatus: (status) => set({ status }, false, 'setStatus'),

      setError: (error) =>
        set({ error, status: error ? 'error' : 'idle' }, false, 'setError'),

      clearError: () => set({ error: null, status: 'idle' }, false, 'clearError'),

      // Input management
      setInputValue: (value) => set({ inputValue: value }, false, 'setInputValue'),

      clearInput: () => set({ inputValue: '' }, false, 'clearInput'),

      // Dropped items
      addDroppedItem: (item) =>
        set(
          (state) => ({
            droppedItems: [...state.droppedItems, item],
          }),
          false,
          'addDroppedItem'
        ),

      removeDroppedItem: (itemId) =>
        set(
          (state) => ({
            droppedItems: state.droppedItems.filter((i) => i.id !== itemId),
          }),
          false,
          'removeDroppedItem'
        ),

      clearDroppedItems: () => set({ droppedItems: [] }, false, 'clearDroppedItems'),

      generateQueryFromDroppedItem: (item) => {
        const payload = item.payload as Record<string, unknown>
        const title = (payload.title || payload.name || item.metadata?.title || 'this item') as string

        const queries: Record<string, string> = {
          problem: `Tell me more about this problem: "${title}".
- What's the root cause?
- Who is most affected?
- What evidence supports this?
- How should we solve it?`,

          feature: `Explain the feature "${title}" in detail:
- Why was this feature suggested?
- What problems does it solve?
- What's the expected impact?
- What are the implementation considerations?`,

          task: `Break down this task: "${title}"
- What are the specific subtasks?
- What technical approach should we use?
- What are the dependencies?
- How long will it realistically take?`,

          'prd-section': `Expand on this PRD section: "${title}"
- What are the key requirements?
- What edge cases should we consider?
- How does this fit with other sections?`,

          timeline: `Provide more details about this timeline phase: "${title}"
- What are the key milestones?
- What are the risks?
- What resources are needed?`,

          'database-schema': `Expand the database schema for "${title}":
- What fields are needed?
- What relationships exist?
- What indexes should we create?
- How will this scale?`,

          prompt: payload.prompt as string || `Help me with: ${title}`,
        }

        return queries[item.type] || `Tell me more about: ${title}`
      },

      // Abort control
      setAbortController: (controller) =>
        set({ abortController: controller }, false, 'setAbortController'),

      abort: () => {
        const { abortController } = get()
        if (abortController) {
          abortController.abort()
          set(
            {
              abortController: null,
              status: 'idle',
            },
            false,
            'abort'
          )
        }
      },

      // Retry
      setLastUserMessage: (message) =>
        set({ lastUserMessage: message }, false, 'setLastUserMessage'),

      prepareRetry: () => {
        const { lastUserMessage, messages } = get()
        if (!lastUserMessage) return null

        // Remove the last assistant message (the failed one)
        const lastAssistantIndex = [...messages]
          .reverse()
          .findIndex((m) => m.role === 'assistant')

        if (lastAssistantIndex !== -1) {
          const actualIndex = messages.length - 1 - lastAssistantIndex
          set(
            (state) => ({
              messages: state.messages.filter((_, i) => i !== actualIndex),
              error: null,
              status: 'idle',
            }),
            false,
            'prepareRetry'
          )
        }

        return lastUserMessage
      },

      // Timeout
      setStreamTimeout: (ms) => set({ streamTimeout: ms }, false, 'setStreamTimeout'),

      // Reset
      reset: () => {
        const { abortController } = get()
        if (abortController) {
          abortController.abort()
        }
        set(initialState, false, 'reset')
      },
    }),
    { name: 'ChatStore' }
  )
)

// ============================================
// SELECTORS - STABLE PRIMITIVES ONLY
// ============================================
// CRITICAL: Selectors MUST return stable references (primitives or memoized values)
// NEVER return inline objects like: (state) => ({ a: state.a, b: state.b })
// This causes "getSnapshot infinite loop" errors in useSyncExternalStore

// Messages - returns array reference (stable unless messages change)
export const selectMessages = (state: ChatStore) => state.messages

// Individual primitive selectors (PREFERRED)
export const selectStatus = (state: ChatStore) => state.status
export const selectError = (state: ChatStore) => state.error
export const selectInputValue = (state: ChatStore) => state.inputValue
export const selectDroppedItems = (state: ChatStore) => state.droppedItems
export const selectLastUserMessage = (state: ChatStore) => state.lastUserMessage

// Derived boolean selectors (STABLE - returns primitive boolean)
export const selectIsLoading = (state: ChatStore) =>
  state.status === 'thinking' || state.status === 'streaming'

export const selectIsStreaming = (state: ChatStore) =>
  state.status === 'streaming'

export const selectIsThinking = (state: ChatStore) =>
  state.status === 'thinking'

export const selectIsIdle = (state: ChatStore) =>
  state.status === 'idle'

export const selectHasError = (state: ChatStore) =>
  state.status === 'error'

export const selectCanRetry = (state: ChatStore) =>
  state.status === 'error' && state.lastUserMessage !== null

// DEPRECATED: These selectors return objects and should NOT be used
// If you need multiple values, use individual selectors or useShallow():
//   import { useShallow } from 'zustand/shallow'
//   const { status, error } = useChatStore(useShallow(s => ({ status: s.status, error: s.error })))
//
// export const selectChatStatus = ...  // REMOVED - caused infinite loop
// export const selectInputState = ...  // REMOVED - caused infinite loop
