/**
 * useInput — unified keyboard + mouse/touch input.
 *
 * Emits directional move events (0-3) and eat events to callbacks supplied
 * by the caller.  Designed to be attached/detached around a canvas element.
 */

import { DIR_UP, DIR_RIGHT, DIR_DOWN, DIR_LEFT } from './useGameEngine'

type MoveCallback = (dir: number) => void
type EatCallback = () => void
type CellClickCallback = (col: number, row: number) => void

export interface InputOptions {
  onMove: MoveCallback
  onEat: EatCallback
  /** Called when the user clicks/taps a specific grid cell. */
  onCellClick?: CellClickCallback
  /** Canvas element used for pointer-coordinate → cell mapping. */
  canvas?: HTMLCanvasElement | null
  gridWidth?: number
  gridHeight?: number
}

export function useInput(options: InputOptions) {
  const { onMove, onEat } = options

  // ── Keyboard ──────────────────────────────────────────────────────────────

  function handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        e.preventDefault()
        onMove(DIR_UP)
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        e.preventDefault()
        onMove(DIR_RIGHT)
        break
      case 'ArrowDown':
      case 's':
      case 'S':
        e.preventDefault()
        onMove(DIR_DOWN)
        break
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault()
        onMove(DIR_LEFT)
        break
      case ' ':
      case 'Enter':
        e.preventDefault()
        onEat()
        break
    }
  }

  // ── Pointer (mouse + touch) ───────────────────────────────────────────────

  function getCanvasCell(clientX: number, clientY: number): { col: number, row: number } | null {
    const canvas = options.canvas
    if (!canvas) return null
    const gw = options.gridWidth ?? 8
    const gh = options.gridHeight ?? 8
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const col = Math.floor((x / rect.width) * gw)
    const row = Math.floor((y / rect.height) * gh)
    if (col < 0 || col >= gw || row < 0 || row >= gh) return null
    return { col, row }
  }

  function handlePointerUp(e: PointerEvent) {
    const cell = getCanvasCell(e.clientX, e.clientY)
    if (cell && options.onCellClick) {
      options.onCellClick(cell.col, cell.row)
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  function attach() {
    window.addEventListener('keydown', handleKeyDown)
    if (options.canvas) {
      options.canvas.addEventListener('pointerup', handlePointerUp)
    }
  }

  function detach() {
    window.removeEventListener('keydown', handleKeyDown)
    if (options.canvas) {
      options.canvas.removeEventListener('pointerup', handlePointerUp)
    }
  }

  return { attach, detach }
}
