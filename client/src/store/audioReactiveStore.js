import { create } from 'zustand'

/**
 * Audio Reactive Store
 * Provides real-time audio frequency data from the Web Audio API.
 * Components subscribe to bass/mid/treble/volume levels for reactive UI.
 */
export const useAudioReactiveStore = create((set) => ({
  // Frequency band levels (0–1 normalized)
  bass: 0,
  mid: 0,
  treble: 0,
  volume: 0,
  isAnalyserActive: false,

  setBands: (bass, mid, treble, volume) =>
    set({ bass, mid, treble, volume }),

  setAnalyserActive: (active) =>
    set({ isAnalyserActive: active }),
}))

// ── Singleton AudioContext + AnalyserNode ────────────────────────
let audioContext = null
let analyserNode = null
let sourceNode = null
let connectedElement = null
let rafId = null

let isSimulating = false
let isYouTubeSimulating = false

// ── Raw Data Export for Canvas Visualizers ───────────────
export const rawFrequencyData = new Uint8Array(128)
export function getRawFrequencyData() {
  return rawFrequencyData
}

/**
 * Connect an <audio> element to the Web Audio API analyser.
 * Call this once when the audio element is ready.
 */
export function connectAudioAnalyser(audioElement) {
  if (!audioElement || connectedElement === audioElement) return

  // Clean up previous connection
  disconnectAudioAnalyser()

  connectedElement = audioElement
  
  const src = audioElement.src || ''
  // Check if it's external cross-origin
  const isExternal = src.startsWith('http') && !src.includes(window.location.hostname)

  if (isExternal) {
    isSimulating = true
    useAudioReactiveStore.getState().setAnalyserActive(true)
    startAnalysisLoop()
    return
  }

  try {
    isSimulating = false
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = 256 // 128 frequency bins
    analyserNode.smoothingTimeConstant = 0.75

    sourceNode = audioContext.createMediaElementSource(audioElement)
    sourceNode.connect(analyserNode)
    analyserNode.connect(audioContext.destination)

    useAudioReactiveStore.getState().setAnalyserActive(true)

    startAnalysisLoop()
  } catch (err) {
    console.warn('Audio analyser setup failed, switching to simulation:', err.message)
    isSimulating = true
    startAnalysisLoop()
  }
}

/**
 * Start YouTube simulation mode.
 * Since we can't tap into YouTube's audio output, we generate
 * realistic-looking frequency data that reacts dynamically.
 */
export function startYouTubeSimulation() {
  isYouTubeSimulating = true
  useAudioReactiveStore.getState().setAnalyserActive(true)
  // Start loop if not already running
  if (!rafId) {
    startAnalysisLoop()
  }
}

/**
 * Stop YouTube simulation mode.
 */
export function stopYouTubeSimulation() {
  isYouTubeSimulating = false
  // Only stop the loop if there's no connected element either
  if (!connectedElement) {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    useAudioReactiveStore.getState().setAnalyserActive(false)
    // Zero out everything
    useAudioReactiveStore.getState().setBands(0, 0, 0, 0)
    rawFrequencyData.fill(0)
  }
}

/**
 * Disconnect and clean up the analyser.
 */
export function disconnectAudioAnalyser() {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  if (sourceNode) {
    try { sourceNode.disconnect() } catch (e) { /* ignore */ }
    sourceNode = null
  }

  if (analyserNode) {
    try { analyserNode.disconnect() } catch (e) { /* ignore */ }
    analyserNode = null
  }

  connectedElement = null
  isSimulating = false
  useAudioReactiveStore.getState().setAnalyserActive(false)
  useAudioReactiveStore.getState().setBands(0, 0, 0, 0)
}

// ── Simulation Helpers ──────────────────────────────────────
// Multiple layers of oscillation to create a convincing frequency spectrum

// Pseudo-random but deterministic per-bin noise
const binPhases = new Float32Array(128)
const binSpeeds = new Float32Array(128)
const binAmplitudes = new Float32Array(128)
for (let i = 0; i < 128; i++) {
  binPhases[i] = Math.random() * Math.PI * 2
  binSpeeds[i] = 1.5 + Math.random() * 4.5
  binAmplitudes[i] = 0.3 + Math.random() * 0.7
}

// Smoothed output for simulation (to avoid jarring jumps)
const smoothedSimData = new Float32Array(128)

/**
 * Generate a realistic frequency spectrum for simulation.
 * Models a typical music spectrum: heavy bass, prominent mids, lighter treble.
 */
function generateSimulatedSpectrum(time, bufferLength) {
  // Beat pattern: strong periodic bass hit every ~0.5s
  const beatPhase = (Math.sin(time * 6.28) + 1) / 2 // ~1Hz beat
  const fastBeat = (Math.sin(time * 12.56) + 1) / 2 // ~2Hz sub-beat
  const beatHit = Math.pow(beatPhase, 3) // Sharp peak on beat
  const subBeatHit = Math.pow(fastBeat, 4) * 0.5

  // Slower musical phrases (volume swell over ~4s)
  const phrase = (Math.sin(time * 1.57) + 1) / 2
  const phraseIntensity = 0.5 + phrase * 0.5

  for (let i = 0; i < bufferLength; i++) {
    const normalizedBin = i / bufferLength // 0 = bass, 1 = treble
    
    // Base energy curve: bass-heavy, falling off towards treble
    // Real music has most energy in bass/low-mid
    let energy
    if (normalizedBin < 0.08) {
      // Sub-bass (0-8%): very strong, beat-driven
      energy = 0.7 + beatHit * 0.3 + subBeatHit * 0.2
    } else if (normalizedBin < 0.2) {
      // Bass (8-20%): strong, beat-driven
      energy = 0.5 + beatHit * 0.35 + subBeatHit * 0.15
    } else if (normalizedBin < 0.45) {
      // Low-mid (20-45%): vocals/instruments, moderate
      energy = 0.35 + Math.sin(time * 3.2 + i * 0.3) * 0.15
    } else if (normalizedBin < 0.7) {
      // High-mid (45-70%): presence, moderate-low
      energy = 0.2 + Math.sin(time * 4.1 + i * 0.5) * 0.12
    } else {
      // Treble (70-100%): hi-hats/air, low but spiky
      energy = 0.08 + Math.pow(Math.max(0, Math.sin(time * 8 + i * 0.8)), 3) * 0.25
    }

    // Per-bin variation (each bin has its own oscillation)
    const binOsc = Math.sin(time * binSpeeds[i] + binPhases[i]) * binAmplitudes[i]
    energy += binOsc * 0.15

    // Apply phrase intensity (musical dynamics)
    energy *= phraseIntensity

    // Random micro-variation for liveliness
    energy += (Math.random() - 0.5) * 0.06

    // Clamp to 0-1
    energy = Math.max(0, Math.min(1, energy))

    // Convert to 0-255 byte value
    const target = energy * 255

    // Smooth transition (prevents jarring jumps)
    smoothedSimData[i] += (target - smoothedSimData[i]) * 0.3
    rawFrequencyData[i] = Math.round(smoothedSimData[i])
  }
}

/**
 * Main rAF loop that reads frequency data and updates the store.
 */
function startAnalysisLoop() {
  const bufferLength = 128
  let simulatedTime = 0

  function tick() {
    // Determine if we should be actively generating data
    const htmlAudioPlaying = connectedElement && !connectedElement.paused && !connectedElement.ended
    const shouldAnimate = htmlAudioPlaying || isYouTubeSimulating

    if (!shouldAnimate) {
      // Decay the visualizer when nothing is playing
      const current = useAudioReactiveStore.getState()
      const decayRate = 0.04
      useAudioReactiveStore.getState().setBands(
        Math.max(0, current.bass - decayRate),
        Math.max(0, current.mid - decayRate),
        Math.max(0, current.treble - decayRate),
        Math.max(0, current.volume - decayRate)
      )
      // Decay raw data too
      for (let i = 0; i < bufferLength; i++) {
        rawFrequencyData[i] = Math.max(0, rawFrequencyData[i] - 8)
      }
      rafId = requestAnimationFrame(tick)
      return
    }

    let bass = 0, mid = 0, treble = 0, volume = 0

    if (isYouTubeSimulating || isSimulating || !analyserNode) {
      // Generate realistic simulated spectrum
      simulatedTime += 0.016 // ~60fps time step
      generateSimulatedSpectrum(simulatedTime, bufferLength)

      // Calculate band levels from simulated data
      let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0
      for (let i = 0; i < bufferLength; i++) {
        const val = rawFrequencyData[i]
        totalSum += val
        if (i <= 8) bassSum += val
        else if (i <= 40) midSum += val
        else trebleSum += val
      }

      bass = Math.min(bassSum / (9 * 255), 1)
      mid = Math.min(midSum / (32 * 255), 1)
      treble = Math.min(trebleSum / (87 * 255), 1)
      volume = Math.min(totalSum / (bufferLength * 255), 1)
    } else {
      // Real Web Audio API data
      analyserNode.getByteFrequencyData(rawFrequencyData)

      let bassSum = 0, midSum = 0, trebleSum = 0, totalSum = 0
      for (let i = 0; i < bufferLength; i++) {
        const val = rawFrequencyData[i]
        totalSum += val
        if (i <= 8) bassSum += val
        else if (i <= 40) midSum += val
        else trebleSum += val
      }

      bass = Math.min(bassSum / (9 * 255), 1)
      mid = Math.min(midSum / (32 * 255), 1)
      treble = Math.min(trebleSum / (87 * 255), 1)
      volume = Math.min(totalSum / (bufferLength * 255), 1)
    }

    useAudioReactiveStore.getState().setBands(bass, mid, treble, volume)
    rafId = requestAnimationFrame(tick)
  }

  tick()
}
