/**
 * Canvas Store - Manages canvas items and selections
 * Handles drag-drop positioning, multi-select, and z-index ordering
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { CanvasItem, DraggableItem, Position, SelectionState } from '@/types/workspace'

interface CanvasState {
  items: CanvasItem[]
  selection: SelectionState
  zoom: number
  pan: Position
  gridSnap: boolean
  gridSize: number
}

interface CanvasActions {
  // Item management
  addItem: (item: DraggableItem, position: Position) => string
  removeItem: (canvasId: string) => void
  removeSelected: () => void
  clearCanvas: () => void

  // Item positioning
  moveItem: (canvasId: string, position: Position) => void
  moveSelected: (delta: Position) => void
  resizeItem: (canvasId: string, dimensions: { width: number; height: number }) => void

  // Item state
  toggleItemExpanded: (canvasId: string) => void
  toggleItemLocked: (canvasId: string) => void
  updateItemPayload: (canvasId: string, payload: unknown) => void

  // Z-index
  bringToFront: (canvasId: string) => void
  sendToBack: (canvasId: string) => void

  // Selection
  selectItem: (canvasId: string, additive?: boolean) => void
  selectMultiple: (canvasIds: string[]) => void
  selectAll: () => void
  clearSelection: () => void
  toggleSelection: (canvasId: string) => void

  // Viewport
  setZoom: (zoom: number) => void
  setPan: (pan: Position) => void
  resetViewport: () => void

  // Grid
  toggleGridSnap: () => void
  setGridSize: (size: number) => void
}

type CanvasStore = CanvasState & CanvasActions

const GRID_SIZE = 20

const snapToGrid = (position: Position, gridSize: number): Position => ({
  x: Math.round(position.x / gridSize) * gridSize,
  y: Math.round(position.y / gridSize) * gridSize,
})

const generateCanvasId = () => `canvas-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const getDefaultDimensions = (type: string) => {
  const sizes: Record<string, { width: number; height: number }> = {
    problem: { width: 320, height: 180 },
    feature: { width: 300, height: 160 },
    task: { width: 280, height: 140 },
    'prd-section': { width: 400, height: 200 },
    prompt: { width: 240, height: 80 },
    default: { width: 300, height: 150 },
  }
  return sizes[type] || sizes.default
}

const initialState: CanvasState = {
  items: [],
  selection: {
    selectedIds: new Set(),
    selectionBox: null,
  },
  zoom: 1,
  pan: { x: 0, y: 0 },
  gridSnap: true,
  gridSize: GRID_SIZE,
}

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Item management
      addItem: (item, position) => {
        const canvasId = generateCanvasId()
        const { gridSnap, gridSize, items } = get()
        const finalPosition = gridSnap ? snapToGrid(position, gridSize) : position
        const dimensions = getDefaultDimensions(item.type)
        const maxZIndex = items.length > 0 ? Math.max(...items.map((i) => i.zIndex)) : 0

        const canvasItem: CanvasItem = {
          ...item,
          canvasId,
          position: finalPosition,
          dimensions,
          zIndex: maxZIndex + 1,
          locked: false,
          expanded: false,
        }

        set(
          (state) => ({ items: [...state.items, canvasItem] }),
          false,
          'addItem'
        )
        return canvasId
      },

      removeItem: (canvasId) =>
        set(
          (state) => ({
            items: state.items.filter((i) => i.canvasId !== canvasId),
            selection: {
              ...state.selection,
              selectedIds: new Set(
                [...state.selection.selectedIds].filter((id) => id !== canvasId)
              ),
            },
          }),
          false,
          'removeItem'
        ),

      removeSelected: () =>
        set(
          (state) => ({
            items: state.items.filter(
              (i) => !state.selection.selectedIds.has(i.canvasId)
            ),
            selection: { selectedIds: new Set(), selectionBox: null },
          }),
          false,
          'removeSelected'
        ),

      clearCanvas: () =>
        set(
          { items: [], selection: { selectedIds: new Set(), selectionBox: null } },
          false,
          'clearCanvas'
        ),

      // Item positioning
      moveItem: (canvasId, position) => {
        const { gridSnap, gridSize } = get()
        const finalPosition = gridSnap ? snapToGrid(position, gridSize) : position

        set(
          (state) => ({
            items: state.items.map((item) =>
              item.canvasId === canvasId && !item.locked
                ? { ...item, position: finalPosition }
                : item
            ),
          }),
          false,
          'moveItem'
        )
      },

      moveSelected: (delta) => {
        const { gridSnap, gridSize } = get()

        set(
          (state) => ({
            items: state.items.map((item) => {
              if (!state.selection.selectedIds.has(item.canvasId) || item.locked) {
                return item
              }
              const newPosition = {
                x: item.position.x + delta.x,
                y: item.position.y + delta.y,
              }
              return {
                ...item,
                position: gridSnap ? snapToGrid(newPosition, gridSize) : newPosition,
              }
            }),
          }),
          false,
          'moveSelected'
        )
      },

      resizeItem: (canvasId, dimensions) =>
        set(
          (state) => ({
            items: state.items.map((item) =>
              item.canvasId === canvasId && !item.locked
                ? {
                    ...item,
                    dimensions: {
                      width: Math.max(200, dimensions.width),
                      height: Math.max(100, dimensions.height),
                    },
                  }
                : item
            ),
          }),
          false,
          'resizeItem'
        ),

      // Item state
      toggleItemExpanded: (canvasId) =>
        set(
          (state) => ({
            items: state.items.map((item) =>
              item.canvasId === canvasId
                ? { ...item, expanded: !item.expanded }
                : item
            ),
          }),
          false,
          'toggleItemExpanded'
        ),

      toggleItemLocked: (canvasId) =>
        set(
          (state) => ({
            items: state.items.map((item) =>
              item.canvasId === canvasId
                ? { ...item, locked: !item.locked }
                : item
            ),
          }),
          false,
          'toggleItemLocked'
        ),

      updateItemPayload: (canvasId, payload) =>
        set(
          (state) => ({
            items: state.items.map((item) =>
              item.canvasId === canvasId ? { ...item, payload } : item
            ),
          }),
          false,
          'updateItemPayload'
        ),

      // Z-index
      bringToFront: (canvasId) =>
        set(
          (state) => {
            const maxZ = Math.max(...state.items.map((i) => i.zIndex), 0)
            return {
              items: state.items.map((item) =>
                item.canvasId === canvasId
                  ? { ...item, zIndex: maxZ + 1 }
                  : item
              ),
            }
          },
          false,
          'bringToFront'
        ),

      sendToBack: (canvasId) =>
        set(
          (state) => {
            const minZ = Math.min(...state.items.map((i) => i.zIndex), 0)
            return {
              items: state.items.map((item) =>
                item.canvasId === canvasId
                  ? { ...item, zIndex: minZ - 1 }
                  : item
              ),
            }
          },
          false,
          'sendToBack'
        ),

      // Selection
      selectItem: (canvasId, additive = false) =>
        set(
          (state) => ({
            selection: {
              ...state.selection,
              selectedIds: additive
                ? new Set([...state.selection.selectedIds, canvasId])
                : new Set([canvasId]),
            },
          }),
          false,
          'selectItem'
        ),

      selectMultiple: (canvasIds) =>
        set(
          { selection: { selectedIds: new Set(canvasIds), selectionBox: null } },
          false,
          'selectMultiple'
        ),

      selectAll: () =>
        set(
          (state) => ({
            selection: {
              selectedIds: new Set(state.items.map((i) => i.canvasId)),
              selectionBox: null,
            },
          }),
          false,
          'selectAll'
        ),

      clearSelection: () =>
        set(
          { selection: { selectedIds: new Set(), selectionBox: null } },
          false,
          'clearSelection'
        ),

      toggleSelection: (canvasId) =>
        set(
          (state) => {
            const newSelected = new Set(state.selection.selectedIds)
            if (newSelected.has(canvasId)) {
              newSelected.delete(canvasId)
            } else {
              newSelected.add(canvasId)
            }
            return { selection: { ...state.selection, selectedIds: newSelected } }
          },
          false,
          'toggleSelection'
        ),

      // Viewport
      setZoom: (zoom) =>
        set({ zoom: Math.max(0.25, Math.min(2, zoom)) }, false, 'setZoom'),

      setPan: (pan) => set({ pan }, false, 'setPan'),

      resetViewport: () =>
        set({ zoom: 1, pan: { x: 0, y: 0 } }, false, 'resetViewport'),

      // Grid
      toggleGridSnap: () =>
        set((state) => ({ gridSnap: !state.gridSnap }), false, 'toggleGridSnap'),

      setGridSize: (size) =>
        set({ gridSize: Math.max(10, Math.min(50, size)) }, false, 'setGridSize'),
    }),
    { name: 'CanvasStore' }
  )
)

// Selectors
export const selectCanvasItems = (state: CanvasStore) => state.items

export const selectSelectedItems = (state: CanvasStore) =>
  state.items.filter((item) => state.selection.selectedIds.has(item.canvasId))

export const selectSelectedIds = (state: CanvasStore) => state.selection.selectedIds

export const selectViewport = (state: CanvasStore) => ({
  zoom: state.zoom,
  pan: state.pan,
})

export const selectGridSettings = (state: CanvasStore) => ({
  gridSnap: state.gridSnap,
  gridSize: state.gridSize,
})
