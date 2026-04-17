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

  // Muncher crunch animation state
  let crunchStart = -Infinity
  let crunchNumber = 0 // the digit being chewed — displayed shrinking mid-crunch

  // Death animation state
  let prevLives = -1
  let deathStart = -Infinity
  let deathFinal = false
  let deathX = 0
  let deathY = 0
  let killerTroggleIdx = -1
  let spawnPop = -Infinity // brief bounce when muncher respawns

  // Crumb / debris particles
  interface Particle { x: number, y: number, vx: number, vy: number, life: number, maxLife: number, size: number, color: string }
  const particles: Particle[] = []
  let lastFrameTime = 0

  // Level-clear celebration state
  let prevGameStateLocal = -1
  let levelClearStart = -Infinity
  const troggleDeathStaggerMs: number[] = [0, 220, 440]
  const troggleBoomSpawned = new Set<number>()

  const EAT_FLASH_MS = 350
  const CRUNCH_MS = 520
  const DEATH_MS = 750
  const DEATH_FINAL_MS = 1600
  const SPAWN_POP_MS = 340
  const LEVEL_CLEAR_MS = 1800
  const TROGGLE_DEATH_MS = 700
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

    // ── Background (painted outside any shake transform) ────────────────────
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, W, H)

    const rule = api.getCurrentRule()
    const state = api.getGameState()
    const isPlaying = state === GAME_STATE_PLAYING

    // ── Detect death (life decrement) ────────────────────────────────────────
    const currentLives = api.getLives()
    if (prevLives > 0 && currentLives < prevLives) {
      deathStart = timestamp
      deathFinal = currentLives <= 0
      // Identify the killer troggle — the one closest to the last muncher spot
      killerTroggleIdx = -1
      let bestDist = Infinity
      const tcNow = api.getTroggleCount()
      for (let i = 0; i < tcNow; i++) {
        const dx = (rTroggleX[i] ?? 0) - rMuncherX
        const dy = (rTroggleY[i] ?? 0) - rMuncherY
        const d = dx * dx + dy * dy
        if (d < bestDist) { bestDist = d; killerTroggleIdx = i }
      }
      // The death visibly happens on the enemy's cell (not in transit).
      if (killerTroggleIdx >= 0) {
        deathX = rTroggleX[killerTroggleIdx] ?? rMuncherX
        deathY = rTroggleY[killerTroggleIdx] ?? rMuncherY
      } else {
        deathX = rMuncherX
        deathY = rMuncherY
      }
      // Explosion of pink/red debris
      const px = deathX * cellW + cellW / 2
      const py = deathY * cellH + cellH / 2
      const n = deathFinal ? 46 : 22
      for (let p = 0; p < n; p++) {
        const a = Math.random() * Math.PI * 2
        const sp = 160 + Math.random() * (deathFinal ? 420 : 280)
        const life = 0.9 + Math.random() * 0.7
        particles.push({
          x: px + Math.cos(a) * 3,
          y: py + Math.sin(a) * 3,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 140,
          life,
          maxLife: life,
          size: 2 + Math.random() * (deathFinal ? 5 : 3),
          color: Math.random() < 0.5 ? C.troggle : '#fdf2f8',
        })
      }
    } else if (prevLives >= 0 && currentLives > prevLives) {
      // Shouldn't happen in normal flow, but reset for new-game safety
    }
    // On game restart (lives goes 0 → 3), clear death state
    if (prevLives === 0 && currentLives > 0) {
      deathStart = -Infinity
    }
    prevLives = currentLives

    // ── Detect level clear → celebration sequence ────────────────────────────
    const gameStateNow = api.getGameState()
    if (prevGameStateLocal !== 3 /* GAME_STATE_LEVEL_CLEAR */ && gameStateNow === 3) {
      levelClearStart = timestamp
      // Confetti rain across the playfield
      const pieces = 70
      for (let p = 0; p < pieces; p++) {
        const a = Math.random() * Math.PI * 2
        const sp = 80 + Math.random() * 260
        const life = 1.2 + Math.random() * 0.9
        const colors = [C.muncher, C.correct, '#facc15', '#f472b6', '#67e8f9', '#fdf2f8']
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H * 0.3,
          vx: Math.cos(a) * sp * 0.4,
          vy: Math.sin(a) * sp * 0.4 - 120 - Math.random() * 180,
          life, maxLife: life,
          size: 2 + Math.random() * 4,
          color: colors[Math.floor(Math.random() * colors.length)]!,
        })
      }
      // Burst at each troggle position (staggered handled by drawTroggle)
    }
    // On advance to next level, reset celebration
    if (prevGameStateLocal === 3 && gameStateNow !== 3) {
      levelClearStart = -Infinity
    }
    prevGameStateLocal = gameStateNow

    const levelClearT = (timestamp - levelClearStart) / LEVEL_CLEAR_MS
    const inLevelClear = levelClearT >= 0 && levelClearT < 1

    const deathT = (timestamp - deathStart) / (deathFinal ? DEATH_FINAL_MS : DEATH_MS)
    const inDeath = deathT >= 0 && deathT < 1
    // Detect death-animation end → trigger spawn pop for the respawned muncher
    if (!inDeath && deathStart !== -Infinity && !deathFinal && deathT >= 1) {
      spawnPop = timestamp
      deathStart = -Infinity
      // Snap interpolation to the respawned position so the pop happens at center
      rMuncherX = api.getMuncherX()
      rMuncherY = api.getMuncherY()
    }

    // ── Screen shake (for final death) ───────────────────────────────────────
    let shakeX = 0, shakeY = 0
    if (inDeath && deathFinal) {
      const amp = (1 - deathT) * 16
      shakeX = (Math.random() - 0.5) * amp * 2
      shakeY = (Math.random() - 0.5) * amp * 2
    }
    ctx.save()
    ctx.translate(shakeX, shakeY)

    // ── Detect newly eaten cells ─────────────────────────────────────────────
    const mx = api.getMuncherX()
    const my = api.getMuncherY()
    const muncherCellIdx = my * gw + mx
    for (let i = 0; i < gw * gh; i++) {
      const eaten = api.isCellEaten(i) === 1
      if (eaten && !prevEaten.has(i)) {
        eatFlashes.set(i, timestamp)
        prevEaten.add(i)
        // If the muncher just ate this cell, trigger crunch + crumbs
        if (i === muncherCellIdx) {
          crunchStart = timestamp
          crunchNumber = api.getCellRaw(i)
          const pcx = mx * cellW + cellW / 2
          const pcy = my * cellH + cellH / 2
          const n = 14
          for (let p = 0; p < n; p++) {
            const a = (p / n) * Math.PI * 2 + Math.random() * 0.4
            const sp = 120 + Math.random() * 220
            particles.push({
              x: pcx + Math.cos(a) * 4,
              y: pcy + Math.sin(a) * 4,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp - 80,
              life: 0.55 + Math.random() * 0.35,
              maxLife: 0.9,
              size: 2 + Math.random() * 3,
              color: Math.random() < 0.5 ? C.muncher : C.correct,
            })
          }
        }
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
      const tcx = (rTroggleX[i] ?? 0) * cellW + cellW / 2
      const tcy = (rTroggleY[i] ?? 0) * cellH + cellH / 2 + bob

      // Level-clear: troggles die one by one with a burst
      if (inLevelClear) {
        const stagger = troggleDeathStaggerMs[i] ?? 0
        const tT = (timestamp - levelClearStart - stagger) / TROGGLE_DEATH_MS
        if (tT < 0) {
          drawTroggle(tcx, tcy, cellW, cellH, timestamp + i * 400)
        } else if (tT < 1) {
          if (!troggleBoomSpawned.has(i)) {
            troggleBoomSpawned.add(i)
            for (let p = 0; p < 24; p++) {
              const a = Math.random() * Math.PI * 2
              const sp = 180 + Math.random() * 320
              const life = 0.8 + Math.random() * 0.6
              particles.push({
                x: tcx, y: tcy,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 140,
                life, maxLife: life,
                size: 2 + Math.random() * 4,
                color: Math.random() < 0.5 ? C.troggle : '#fdf2f8',
              })
            }
          }
          drawDyingTroggle(tcx, tcy, cellW, cellH, tT)
        }
        // After tT >= 1, troggle is gone — don't draw
        continue
      }

      // Killer troggle lunges on death: scale pulse + forward offset
      let lungeScale = 1
      let lungeY = 0
      if (inDeath && i === killerTroggleIdx) {
        const pulse = Math.sin(Math.min(deathT, 1) * Math.PI)
        lungeScale = 1 + pulse * 0.35
        lungeY = -pulse * 4
      }
      ctx.save()
      const ltcy = tcy + lungeY
      ctx.translate(tcx, ltcy)
      ctx.scale(lungeScale, lungeScale)
      ctx.translate(-tcx, -ltcy)
      drawTroggle(tcx, ltcy, cellW, cellH, timestamp + i * 400)
      ctx.restore()
    }

    // ── Particles (crumbs) ───────────────────────────────────────────────────
    const dt = lastFrameTime > 0 ? Math.min(0.05, (timestamp - lastFrameTime) / 1000) : 0
    lastFrameTime = timestamp
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 520 * dt // gravity
      p.vx *= 0.96
      p.life -= dt
      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6))
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // ── Muncher (or dying muncher) ───────────────────────────────────────────
    if (inDeath) {
      drawDyingMuncher(
        deathX * cellW + cellW / 2,
        deathY * cellH + cellH / 2,
        cellW, cellH, deathT, deathFinal,
      )
    } else {
      const idlePhase = isPlaying ? timestamp / 320 : 0
      const crunchT = (timestamp - crunchStart) / CRUNCH_MS
      const mCol = Math.round(rMuncherX)
      const mRow = Math.round(rMuncherY)
      let underNum = -1
      if (mCol >= 0 && mCol < gw && mRow >= 0 && mRow < gh) {
        const mIdx = mRow * gw + mCol
        if (api.isCellEaten(mIdx) !== 1) underNum = api.getCellRaw(mIdx)
      }
      const displayNum = crunchT < 1 ? crunchNumber : underNum
      const displayCorrect = displayNum >= 0 && checkRule(displayNum, rule)
      // The number is anchored to the muncher's target cell, not his
      // interpolated sprite position — so it doesn't slide with him.
      const tMX = api.getMuncherX()
      const tMY = api.getMuncherY()
      const numCx = tMX * cellW + cellW / 2
      const numCy = tMY * cellH + cellH / 2
      // Spawn-pop: brief scale-up bounce after respawn
      const popT = (timestamp - spawnPop) / SPAWN_POP_MS
      const popping = popT >= 0 && popT < 1
      if (popping) {
        const cx = rMuncherX * cellW + cellW / 2
        const cy = rMuncherY * cellH + cellH / 2
        const s = 0.4 + popT * 0.85 + Math.sin(popT * Math.PI) * 0.25
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(s, s)
        ctx.translate(-cx, -cy)
        drawMuncher(cx, cy, cellW, cellH, idlePhase, crunchT, displayNum, displayCorrect, numCx, numCy)
        ctx.restore()
      } else if (inLevelClear) {
        // Victory: repeated hop + spin
        const hopPhase = levelClearT * Math.PI * 4
        const hop = Math.abs(Math.sin(hopPhase)) * cellH * 0.35
        const spin = Math.sin(levelClearT * Math.PI * 3) * 0.35
        const cx = rMuncherX * cellW + cellW / 2
        const cy = rMuncherY * cellH + cellH / 2 - hop
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(spin)
        ctx.translate(-cx, -cy)
        drawMuncher(cx, cy, cellW, cellH, idlePhase, crunchT, -1, false, numCx, numCy)
        ctx.restore()
      } else {
        drawMuncher(
          rMuncherX * cellW + cellW / 2,
          rMuncherY * cellH + cellH / 2,
          cellW, cellH, idlePhase, crunchT, displayNum, displayCorrect,
          numCx, numCy,
        )
      }
    }

    // ── End shake transform ──────────────────────────────────────────────────
    ctx.restore()

    // ── Final-death overlay: white flash → red vignette ──────────────────────
    if (inDeath && deathFinal) {
      if (deathT < 0.12) {
        ctx.fillStyle = `rgba(255, 230, 230, ${(1 - deathT / 0.12) * 0.7})`
        ctx.fillRect(0, 0, W, H)
      }
      const vAlpha = Math.sin(Math.min(1, deathT) * Math.PI) * 0.65
      const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7)
      grad.addColorStop(0, 'rgba(120, 0, 30, 0)')
      grad.addColorStop(0.55, `rgba(180, 20, 60, ${vAlpha * 0.35})`)
      grad.addColorStop(1, `rgba(120, 0, 30, ${vAlpha})`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)
    }
  }

  // ── Sprite helpers ─────────────────────────────────────────────────────────

  function drawMuncher(
    cx: number, cy: number, cw: number, ch: number,
    idlePhase: number, crunchT: number,
    displayNum: number, displayCorrect: boolean,
    numCx: number = cx, numCy: number = cy,
  ) {
    const r = Math.min(cw, ch) * 0.42
    const crunching = crunchT >= 0 && crunchT < 1

    // Mouth gap (0 = closed, 1 = wide). Idle: gentle chomp. Crunch: triple rapid snap.
    let gapFrac: number
    if (crunching) {
      // Rapid 3× snap that tapers off — |sin| gives us open-close cycles
      const snap = Math.abs(Math.sin(crunchT * Math.PI * 3))
      const env = 1 - crunchT // ease-out envelope
      gapFrac = snap * 0.85 * env
    } else {
      gapFrac = 0.62 + (Math.sin(idlePhase) * 0.5 + 0.5) * 0.22 // 0.62..0.84 — wide so number is clearly visible
    }

    // Squash/stretch during crunch: compress vertically on snap
    let sx = 1, sy = 1
    if (crunching) {
      const pulse = Math.sin(crunchT * Math.PI * 3) // +=open, -=closed
      sx = 1 + Math.max(0, -pulse) * 0.22 // wider when closed
      sy = 1 - Math.max(0, -pulse) * 0.18 // shorter when closed
    }

    // Shake during first half of crunch
    let shx = 0, shy = 0
    if (crunching && crunchT < 0.55) {
      const amp = (1 - crunchT / 0.55) * r * 0.09
      shx = (Math.random() - 0.5) * amp
      shy = (Math.random() - 0.5) * amp
    }
    cx += shx
    cy += shy

    const rx = r * sx
    const ry = r * sy
    const g = gapFrac * ry * 0.8 // half-height of mouth gap — large so the digit reads clearly

    // ── Shadow ──
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + ry * 0.95, rx * 0.75, ry * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()

    // ── Number in mouth (drawn before jaws so jaws can clip/cover it) ──
    if (displayNum >= 0) {
      // Number shrinks as mouth closes during crunch
      const numScale = crunching
        ? Math.max(0, 1 - crunchT * 1.4) * (0.5 + gapFrac * 0.8)
        : 1
      if (numScale > 0.05) {
        const fontSize = Math.floor(ch * 0.36 * numScale)
        ctx.font = `700 ${fontSize}px 'JetBrains Mono', ui-monospace, 'Courier New', monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(10, 11, 30, 0.95)'
        ctx.strokeText(String(displayNum), numCx, numCy)
        ctx.fillStyle = displayCorrect ? C.correctText : C.wrongText
        ctx.fillText(String(displayNum), numCx, numCy)
      }
    }

    // ── Upper jaw ──
    ctx.fillStyle = C.muncher
    ctx.beginPath()
    ctx.moveTo(cx - rx, cy - g)
    ctx.arc(cx, cy - g, rx, Math.PI, 0, false) // upper semicircle
    ctx.closePath()
    ctx.fill()
    // Upper-jaw highlight
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.beginPath()
    ctx.ellipse(cx - rx * 0.25, cy - g - ry * 0.55, rx * 0.35, ry * 0.18, -0.3, 0, Math.PI * 2)
    ctx.fill()
    // Upper-jaw bottom edge (darker)
    ctx.fillStyle = C.muncherDark
    ctx.fillRect(cx - rx, cy - g - 1, rx * 2, 2)

    // ── Lower jaw ──
    ctx.fillStyle = C.muncherDark
    ctx.beginPath()
    ctx.moveTo(cx - rx, cy + g)
    ctx.arc(cx, cy + g, rx, 0, Math.PI, false) // lower semicircle (clockwise down)
    ctx.closePath()
    ctx.fill()
    // Lower-jaw top accent
    ctx.fillStyle = C.muncher
    ctx.fillRect(cx - rx, cy + g - 1, rx * 2, 3)

    // ── Teeth (hide when mouth closed to avoid poke-through) ──
    if (gapFrac > 0.1) {
      const teethCount = 4
      const teethSpan = rx * 1.1
      const toothW = teethSpan / teethCount * 0.55
      const toothH = Math.min(g * 0.75, ry * 0.14)
      ctx.fillStyle = '#f0fff4'
      for (let i = 0; i < teethCount; i++) {
        const tx = cx - teethSpan / 2 + (i + 0.5) * (teethSpan / teethCount)
        // Upper teeth — point down
        ctx.beginPath()
        ctx.moveTo(tx - toothW / 2, cy - g)
        ctx.lineTo(tx + toothW / 2, cy - g)
        ctx.lineTo(tx, cy - g + toothH)
        ctx.closePath()
        ctx.fill()
        // Lower teeth — point up
        ctx.beginPath()
        ctx.moveTo(tx - toothW / 2, cy + g)
        ctx.lineTo(tx + toothW / 2, cy + g)
        ctx.lineTo(tx, cy + g - toothH)
        ctx.closePath()
        ctx.fill()
      }
    }

    // ── Eyes on upper jaw ──
    const eyeY = cy - g - ry * 0.45
    const eyeR = rx * 0.15
    // Squint during crunch snap
    const squint = crunching ? Math.max(0, -Math.sin(crunchT * Math.PI * 3)) : 0
    for (const side of [-1, 1]) {
      const ex = cx + side * rx * 0.42
      // White of eye
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(ex, eyeY, eyeR, eyeR * (1 - squint * 0.85), 0, 0, Math.PI * 2)
      ctx.fill()
      // Pupil
      if (squint < 0.8) {
        ctx.fillStyle = C.muncherEye
        ctx.beginPath()
        ctx.arc(ex, eyeY, eyeR * 0.55, 0, Math.PI * 2)
        ctx.fill()
        // Catchlight
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(ex + eyeR * 0.2, eyeY - eyeR * 0.2, eyeR * 0.18, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  function drawDyingMuncher(
    cx: number, cy: number, cw: number, ch: number, t: number, final: boolean,
  ) {
    const r = Math.min(cw, ch) * 0.42
    // Shake in first third
    if (t < 0.35) {
      const amp = (1 - t / 0.35) * r * 0.14
      cx += (Math.random() - 0.5) * amp
      cy += (Math.random() - 0.5) * amp
    }
    // Motion: bounce up then fall (final: higher, slower)
    const riseT = Math.min(1, t / 0.5)
    const rise = Math.sin(riseT * Math.PI) * r * (final ? 1.6 : 0.9)
    const fall = Math.max(0, t - 0.6) * (final ? 1.8 : 2.4) * r * 2
    const yOffset = -rise + fall
    // Spin
    const spinSpeed = final ? 8 : 5
    const rotation = t * Math.PI * spinSpeed
    // Shrink + fade
    const scale = Math.max(0.1, 1 - t * (final ? 0.6 : 0.8) + Math.sin(t * Math.PI) * 0.15)
    const alpha = Math.max(0, 1 - Math.pow(t, 1.6))

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(cx, cy + yOffset)
    ctx.rotate(rotation)
    ctx.scale(scale, scale)

    // Body — desaturated green → grey as t increases
    const bodyLight = 45 - t * 20
    const bodySat = 60 - t * 55
    ctx.fillStyle = `hsl(140, ${bodySat}%, ${bodyLight}%)`
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()

    // Darker mouth line (jaws clamped shut)
    ctx.strokeStyle = `hsl(140, ${bodySat}%, ${Math.max(10, bodyLight - 20)}%)`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-r * 0.7, 0)
    ctx.lineTo(r * 0.7, 0)
    ctx.stroke()

    // X-eyes (dead)
    ctx.strokeStyle = '#0a0b1e'
    ctx.lineWidth = Math.max(2, r * 0.08)
    ctx.lineCap = 'round'
    for (const side of [-1, 1]) {
      const ex = side * r * 0.38
      const ey = -r * 0.3
      const s = r * 0.14
      ctx.beginPath(); ctx.moveTo(ex - s, ey - s); ctx.lineTo(ex + s, ey + s); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(ex - s, ey + s); ctx.lineTo(ex + s, ey - s); ctx.stroke()
    }

    // Sparkle/halo for final death
    if (final && t < 0.5) {
      const halo = (1 - t / 0.5)
      ctx.strokeStyle = `rgba(253, 242, 248, ${halo * 0.9})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, r * (1 + t * 1.4), 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.restore()
  }

  function drawDyingTroggle(cx: number, cy: number, cw: number, ch: number, t: number) {
    const r = Math.min(cw, ch) * 0.33
    const spin = t * Math.PI * 6
    const scale = Math.max(0, 1 + Math.sin(t * Math.PI) * 0.25 - t * 0.9)
    const alpha = Math.max(0, 1 - Math.pow(t, 1.4))
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(cx, cy - t * r * 0.6)
    ctx.rotate(spin)
    ctx.scale(scale, scale)
    // Body
    ctx.fillStyle = C.troggle
    ctx.beginPath()
    ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.35)
    ctx.fill()
    // X-eyes
    ctx.strokeStyle = '#fdf2f8'
    ctx.lineWidth = Math.max(2, r * 0.1)
    ctx.lineCap = 'round'
    for (const side of [-1, 1]) {
      const ex = side * r * 0.32
      const ey = -r * 0.2
      const s = r * 0.13
      ctx.beginPath(); ctx.moveTo(ex - s, ey - s); ctx.lineTo(ex + s, ey + s); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(ex - s, ey + s); ctx.lineTo(ex + s, ey - s); ctx.stroke()
    }
    // Expanding ring
    if (t < 0.4) {
      const halo = (1 - t / 0.4)
      ctx.strokeStyle = `rgba(253, 242, 248, ${halo * 0.85})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, r * (1 + t * 2), 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()
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
    particles.length = 0
    crunchStart = -Infinity
    deathStart = -Infinity
    spawnPop = -Infinity
    levelClearStart = -Infinity
    troggleBoomSpawned.clear()
    prevLives = api.getLives()
    prevGameStateLocal = api.getGameState()
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
