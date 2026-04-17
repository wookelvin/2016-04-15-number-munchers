/**
 * useRenderer — Canvas 2D renderer with smooth interpolation and animations.
 * HUD and overlay screens are handled by Vue components; this file only draws
 * the game grid, sprites, and cell-eat flash effects.
 */

import type { GameEngineExports } from './useGameEngine'
import { GAME_STATE_PLAYING } from './useGameEngine'

// ── Colour palette ────────────────────────────────────────────────────────────
// Kept in sync with CSS variables in app/assets/css/main.css (Arcade Neon).

const C = {
  bg: '#0a0b1e', // --background
  cellBg: '#14162e', // --card
  cellBorder: 'rgba(127, 135, 196, 0.18)', // --border
  correct: '#22d3ee', // --accent (cyan) — cells that match the rule
  correctHover: '#67e8f9',
  correctText: '#052633',
  wrong: '#1d1f3d', // --secondary — neutral dim for non-matching cells
  wrongText: '#c7d2fe', // soft indigo text
  eaten: '#0a0b1e',
  eatFlash: '#4ade80', // --primary green flash on successful eat
  muncher: '#4ade80', // --primary
  muncherDark: '#16a34a',
  muncherEye: '#07200f',
  troggle: '#ec4899', // --destructive
  troggleDark: '#be185d',
  troggleEye: '#fdf2f8',
}

// ── Renderer ──────────────────────────────────────────────────────────────────

export interface RendererSnapshot {
  muncherX: number
  muncherY: number
  gameState: number
}

export function useRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!

  // Interpolated positions
  let rMuncherX = 0
  let rMuncherY = 0
  const rTroggleX: number[] = [0, 0, 0]
  const rTroggleY: number[] = [0, 0, 0]

  // Eat flash: cellIndex → timestamp when eaten
  const eatFlashes = new Map<number, number>()
  // Track which cells were eaten last frame to detect new eats
  const prevEaten = new Set<number>()

  const EAT_FLASH_MS = 350
  const LERP = 0.22 // per-frame interpolation factor

  // ── DPR-aware resize ──────────────────────────────────────────────────────

  let lastDpr = -1
  let lastW = -1
  let lastH = -1

  function resize() {
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === lastW && h === lastH && dpr === lastDpr) return
    lastW = w; lastH = h; lastDpr = dpr
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.scale(dpr, dpr)
  }

  // ── Main draw ─────────────────────────────────────────────────────────────

  function drawFrame(api: GameEngineExports, timestamp: number) {
    resize()

    const W = canvas.clientWidth
    const H = canvas.clientHeight
    const gw = api.getGridWidth()
    const gh = api.getGridHeight()
    const cellW = W / gw
    const cellH = H / gh

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, W, H)

    const rule = api.getCurrentRule()
    const state = api.getGameState()
    const isPlaying = state === GAME_STATE_PLAYING

    // ── Detect newly eaten cells ─────────────────────────────────────────────
    for (let i = 0; i < gw * gh; i++) {
      const eaten = api.isCellEaten(i) === 1
      if (eaten && !prevEaten.has(i)) {
        eatFlashes.set(i, timestamp)
        prevEaten.add(i)
      } else if (!eaten && prevEaten.has(i)) {
        prevEaten.delete(i)
      }
    }

    // ── Grid cells ──────────────────────────────────────────────────────────
    const pad = 3
    for (let row = 0; row < gh; row++) {
      for (let col = 0; col < gw; col++) {
        const i = row * gw + col
        const eaten = api.isCellEaten(i) === 1
        const num = api.getCellRaw(i)
        const cx = col * cellW
        const cy = row * cellH

        if (eaten) {
          // Check for flash
          const flashStart = eatFlashes.get(i)
          if (flashStart !== undefined) {
            const t = (timestamp - flashStart) / EAT_FLASH_MS
            if (t < 1) {
              const alpha = 1 - t
              ctx.globalAlpha = alpha * 0.7
              ctx.fillStyle = C.eatFlash
              ctx.fillRect(cx + pad, cy + pad, cellW - pad * 2, cellH - pad * 2)
              ctx.globalAlpha = 1
            } else {
              eatFlashes.delete(i)
            }
          }
          continue
        }

        const isCorrect = checkRule(num, rule)
        ctx.fillStyle = isCorrect ? C.correct : C.cellBg
        ctx.fillRect(cx + pad, cy + pad, cellW - pad * 2, cellH - pad * 2)

        ctx.fillStyle = isCorrect ? C.correctText : C.wrongText
        ctx.font = `700 ${Math.floor(cellH * 0.4)}px 'JetBrains Mono', ui-monospace, 'Courier New', monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(num), cx + cellW / 2, cy + cellH / 2)
      }
    }

    // ── Grid lines ──────────────────────────────────────────────────────────
    ctx.strokeStyle = C.cellBorder
    ctx.lineWidth = 1
    for (let col = 0; col <= gw; col++) {
      ctx.beginPath(); ctx.moveTo(col * cellW, 0); ctx.lineTo(col * cellW, H); ctx.stroke()
    }
    for (let row = 0; row <= gh; row++) {
      ctx.beginPath(); ctx.moveTo(0, row * cellH); ctx.lineTo(W, row * cellH); ctx.stroke()
    }

    // ── Interpolate positions ────────────────────────────────────────────────
    const tMuncherX = api.getMuncherX()
    const tMuncherY = api.getMuncherY()
    rMuncherX += (tMuncherX - rMuncherX) * LERP * (isPlaying ? 1 : 0.05)
    rMuncherY += (tMuncherY - rMuncherY) * LERP * (isPlaying ? 1 : 0.05)

    const tc = api.getTroggleCount()
    for (let i = 0; i < tc; i++) {
      const curX = rTroggleX[i] ?? api.getTroggleX(i)
      const curY = rTroggleY[i] ?? api.getTroggleY(i)
      rTroggleX[i] = curX + (api.getTroggleX(i) - curX) * LERP
      rTroggleY[i] = curY + (api.getTroggleY(i) - curY) * LERP
    }

    // ── Troggles ─────────────────────────────────────────────────────────────
    for (let i = 0; i < tc; i++) {
      const bob = Math.sin(timestamp / 280 + i * 2.1) * 3
      drawTroggle(
        (rTroggleX[i] ?? 0) * cellW + cellW / 2,
        (rTroggleY[i] ?? 0) * cellH + cellH / 2 + bob,
        cellW, cellH, timestamp + i * 400,
      )
    }

    // ── Muncher ──────────────────────────────────────────────────────────────
    const mouthPhase = isPlaying ? timestamp / 120 : 0
    drawMuncher(rMuncherX * cellW + cellW / 2, rMuncherY * cellH + cellH / 2, cellW, cellH, mouthPhase)
  }

  // ── Sprite helpers ─────────────────────────────────────────────────────────

  function drawMuncher(cx: number, cy: number, cw: number, ch: number, mouthPhase: number) {
    const r = Math.min(cw, ch) * 0.36
    const mouthOpen = (Math.sin(mouthPhase) * 0.5 + 0.5) * 0.45 + 0.05

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + r * 0.9, r * 0.7, r * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()

    // Body
    ctx.fillStyle = C.muncher
    ctx.beginPath()
    ctx.arc(cx, cy, r, mouthOpen * Math.PI, (2 - mouthOpen) * Math.PI)
    ctx.lineTo(cx, cy)
    ctx.closePath()
    ctx.fill()

    // Shine
    ctx.fillStyle = C.muncherDark
    ctx.beginPath()
    ctx.arc(cx, cy, r, (1 + mouthOpen) * Math.PI, (2 - mouthOpen) * Math.PI)
    ctx.lineTo(cx, cy)
    ctx.closePath()
    ctx.fill()

    // Eye
    ctx.fillStyle = C.muncherEye
    const eyeAngle = Math.PI * 1.65
    ctx.beginPath()
    ctx.arc(cx + Math.cos(eyeAngle) * r * 0.55, cy + Math.sin(eyeAngle) * r * 0.55, r * 0.14, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawTroggle(cx: number, cy: number, cw: number, ch: number, t: number) {
    const r = Math.min(cw, ch) * 0.33
    const squish = 1 + Math.sin(t / 200) * 0.06

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + r * 0.95, r * 0.65, r * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()

    // Body
    ctx.fillStyle = C.troggle
    ctx.beginPath()
    ctx.roundRect(cx - r * squish, cy - r / squish, r * 2 * squish, r * 2 / squish, r * 0.35)
    ctx.fill()

    // Dark underside
    ctx.fillStyle = C.troggleDark
    ctx.beginPath()
    ctx.roundRect(cx - r * squish, cy + r * 0.1 / squish, r * 2 * squish, r * 0.9 / squish, r * 0.35)
    ctx.fill()

    // Eyes
    const ex = r * 0.32
    const ey = -r * 0.2
    for (const side of [-1, 1]) {
      ctx.fillStyle = C.troggleEye
      ctx.beginPath()
      ctx.arc(cx + side * ex, cy + ey, r * 0.22, 0, Math.PI * 2)
      ctx.fill()
      // Pupil
      ctx.fillStyle = C.troggle
      ctx.beginPath()
      ctx.arc(cx + side * ex + side * 0.04 * r, cy + ey, r * 0.1, 0, Math.PI * 2)
      ctx.fill()
    }

    // Spiky top
    const spikes = 3
    ctx.fillStyle = C.troggle
    for (let s = 0; s < spikes; s++) {
      const sx = cx - r * 0.6 + s * (r * 0.6)
      ctx.beginPath()
      ctx.moveTo(sx, cy - r / squish)
      ctx.lineTo(sx - r * 0.18, cy - r / squish - r * 0.28)
      ctx.lineTo(sx + r * 0.18, cy - r / squish)
      ctx.closePath()
      ctx.fill()
    }
  }

  // ── Reset interpolation (call on new game) ────────────────────────────────

  function resetPositions(api: GameEngineExports) {
    rMuncherX = api.getMuncherX()
    rMuncherY = api.getMuncherY()
    const tc = api.getTroggleCount()
    for (let i = 0; i < tc; i++) {
      rTroggleX[i] = api.getTroggleX(i)
      rTroggleY[i] = api.getTroggleY(i)
    }
    eatFlashes.clear()
    prevEaten.clear()
  }

  return { drawFrame, resetPositions }
}

// ── Rule check mirror (for cell colouring) ────────────────────────────────────

function isPrime(n: number): boolean {
  if (n < 2) return false
  if (n === 2) return true
  if (n % 2 === 0) return false
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false
  return true
}

export function checkRule(num: number, rule: number): boolean {
  if (rule === 0) return num % 3 === 0
  if (rule === 1) return 24 % num === 0
  if (rule === 2) return isPrime(num)
  if (rule === 3) return num > 50
  if (rule === 4) return num === 7
  return false
}
