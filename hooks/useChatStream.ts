/**
 * Chat Stream Hook - Robust streaming with timeout and retry
 *
 * FIXES APPLIED:
 * - Fixed timeout throw inside setTimeout (was silently failing)
 * - Added SSE buffer for chunks spanning boundaries
 * - Added proper state tracking with useRef + useState
 * - Improved error handling
 * - Added retry logic
 */

import { useRef, useCallback, useState } from 'react'

interface StreamOptions {
  timeout?: number
  onChunk?: (chunk: string, progress?: number) => void
  onComplete?: (fullResponse: string) => void
  onError?: (error: Error) => void
  retries?: number
}

interface StreamResult {
  content: string
  provider?: string
  aborted?: boolean
}

interface UseChatStreamReturn {
  stream: (url: string, body: any, options?: StreamOptions) => Promise<StreamResult>
  abort: () => void
  isStreaming: boolean
  error: Error | null
}

// Default config
const DEFAULTS = {
  TIMEOUT: 60000,     // 60 seconds (increased)
  RETRIES: 1,
  RETRY_DELAY: 1000,
}

export function useChatStream(): UseChatStreamReturn {
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastChunkTimeRef = useRef<number>(Date.now())
  const sseBufferRef = useRef<string>('')  // Buffer for incomplete SSE data
  const rejectRef = useRef<((reason: Error) => void) | null>(null)

  // Use state for reactive values
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    abortControllerRef.current = null
    sseBufferRef.current = ''
    rejectRef.current = null
    setIsStreaming(false)
  }, [])

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      cleanup()
    }
  }, [cleanup])

  const stream = useCallback(
    async (
      url: string,
      body: any,
      options: StreamOptions = {}
    ): Promise<StreamResult> => {
      const {
        timeout = DEFAULTS.TIMEOUT,
        onChunk,
        onComplete,
        onError,
        retries = DEFAULTS.RETRIES,
      } = options

      // Cleanup previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      cleanup()
      setError(null)

      // Create new abort controller
      abortControllerRef.current = new AbortController()
      setIsStreaming(true)
      lastChunkTimeRef.current = Date.now()

      let fullResponse = ''
      let provider: string | undefined
      let hasReceivedData = false
      let attemptCount = 0

      // Setup timeout with proper rejection
      const setupTimeout = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
          const timeSinceLastChunk = Date.now() - lastChunkTimeRef.current

          // Only trigger if actually timed out
          if (timeSinceLastChunk >= timeout * 0.9) { // 90% threshold
            const timeoutError = new Error(
              hasReceivedData
                ? `Stream timeout - no data received for ${Math.round(timeout / 1000)} seconds`
                : 'Request timeout - server not responding'
            )
            setError(timeoutError)
            onError?.(timeoutError)
            abort()

            // Properly reject the promise instead of throwing
            if (rejectRef.current) {
              rejectRef.current(timeoutError)
            }
          }
        }, timeout)
      }

      // Parse SSE line
      const parseSSELine = (line: string): { content?: string; provider?: string; error?: string; done?: boolean; progress?: number } | null => {
        if (!line.startsWith('data: ')) return null

        const data = line.slice(6).trim()
        if (data === '[DONE]') return { done: true }

        try {
          return JSON.parse(data)
        } catch {
          // Incomplete JSON, buffer for next chunk
          return null
        }
      }

      // Process buffered SSE data
      const processSSEBuffer = (chunk: string): void => {
        sseBufferRef.current += chunk
        const lines = sseBufferRef.current.split('\n')

        // Keep last incomplete line in buffer
        sseBufferRef.current = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          const parsed = parseSSELine(trimmed)
          if (!parsed) continue

          if (parsed.error) {
            const serverError = new Error(parsed.error)
            setError(serverError)
            onError?.(serverError)
            throw serverError
          }

          if (parsed.content) {
            fullResponse += parsed.content
            if (parsed.provider) provider = parsed.provider
            onChunk?.(parsed.content, parsed.progress)
          }

          if (parsed.done) {
            // Stream complete signal received
            break
          }
        }
      }

      const attemptStream = async (): Promise<StreamResult> => {
        return new Promise<StreamResult>((resolve, reject) => {
          rejectRef.current = reject
          setupTimeout()

          ;(async () => {
            try {
              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'text/event-stream',
                },
                body: JSON.stringify(body),
                signal: abortControllerRef.current?.signal,
              })

              if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`
                try {
                  const errorBody = await response.json()
                  errorMessage = errorBody.error || errorMessage
                } catch {
                  errorMessage = response.statusText || errorMessage
                }
                throw new Error(errorMessage)
              }

              if (!response.body) {
                throw new Error('No response body received')
              }

              const reader = response.body.getReader()
              const decoder = new TextDecoder()

              while (true) {
                const { done, value } = await reader.read()

                if (done) break

                hasReceivedData = true
                lastChunkTimeRef.current = Date.now()
                setupTimeout() // Reset timeout on each chunk

                const chunk = decoder.decode(value, { stream: true })
                processSSEBuffer(chunk)
              }

              // Process remaining buffer
              if (sseBufferRef.current.trim()) {
                processSSEBuffer('\n')
              }

              // Success
              if (timeoutRef.current) clearTimeout(timeoutRef.current)
              onComplete?.(fullResponse)
              cleanup()
              resolve({ content: fullResponse, provider })

            } catch (err) {
              if (timeoutRef.current) clearTimeout(timeoutRef.current)

              if (err instanceof Error) {
                if (err.name === 'AbortError') {
                  resolve({ content: fullResponse, provider, aborted: true })
                  return
                }
                reject(err)
              } else {
                reject(new Error('Unknown streaming error'))
              }
            }
          })()
        })
      }

      // Retry logic
      while (attemptCount <= retries) {
        try {
          return await attemptStream()
        } catch (err) {
          attemptCount++

          if (attemptCount > retries) {
            const finalError = err instanceof Error ? err : new Error('Stream failed')
            setError(finalError)
            onError?.(finalError)
            cleanup()
            throw finalError
          }

          // Wait before retry
          await new Promise(r => setTimeout(r, DEFAULTS.RETRY_DELAY))

          // Reset for retry
          fullResponse = ''
          hasReceivedData = false
          sseBufferRef.current = ''
          abortControllerRef.current = new AbortController()

          console.warn(`Stream attempt ${attemptCount} failed, retrying...`)
        }
      }

      // Should never reach here
      throw new Error('Stream failed after retries')
    },
    [abort, cleanup]
  )

  return {
    stream,
    abort,
    isStreaming,
    error,
  }
}

export default useChatStream
