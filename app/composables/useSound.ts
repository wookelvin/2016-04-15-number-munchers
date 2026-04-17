/**
 * useSound — synthesised Web Audio sound effects.
 * AudioContext is created lazily on first use (requires a user gesture).
 */

export function useSound() {
  let actx: AudioContext | null = null

  function ctx(): AudioContext {
    if (!actx) actx = new AudioContext()
    // Resume if suspended (browser autoplay policy)
    if (actx.state === 'suspended') actx.resume()
    return actx
  }

  function tone(
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType = 'square',
    gain = 0.12,
  ) {
    const ac = ctx()
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.connect(env)
    env.connect(ac.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freq, startTime)
    env.gain.setValueAtTime(gain, startTime)
    env.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    osc.start(startTime)
    osc.stop(startTime + duration + 0.01)
  }

  function sweep(
    freqStart: number,
    freqEnd: number,
    startTime: number,
    duration: number,
    type: OscillatorType = 'square',
    gain = 0.12,
  ) {
    const ac = ctx()
    const osc = ac.createOscillator()
    const env = ac.createGain()
    osc.connect(env)
    env.connect(ac.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freqStart, startTime)
    osc.frequency.linearRampToValueAtTime(freqEnd, startTime + duration)
    env.gain.setValueAtTime(gain, startTime)
    env.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    osc.start(startTime)
    osc.stop(startTime + duration + 0.01)
  }

  // ── Sound effects ─────────────────────────────────────────────────────────

  function playEat() {
    const t = ctx().currentTime
    sweep(440, 880, t, 0.06, 'triangle', 0.1)
  }

  function playWrongEat() {
    const t = ctx().currentTime
    sweep(300, 120, t, 0.18, 'sawtooth', 0.1)
  }

  function playMove() {
    const t = ctx().currentTime
    tone(880, t, 0.03, 'square', 0.04)
  }

  function playLevelClear() {
    const t = ctx().currentTime
    const notes = [523, 659, 784, 1047] // C5 E5 G5 C6
    notes.forEach((f, i) => tone(f, t + i * 0.1, 0.12, 'triangle', 0.12))
  }

  function playGameOver() {
    const t = ctx().currentTime
    const notes = [440, 349, 262, 196] // A4 F4 C4 G3
    notes.forEach((f, i) => tone(f, t + i * 0.16, 0.2, 'sawtooth', 0.1))
  }

  function playDeath() {
    const t = ctx().currentTime
    sweep(440, 110, t, 0.4, 'sawtooth', 0.12)
  }

  return { playEat, playWrongEat, playMove, playLevelClear, playGameOver, playDeath }
}
