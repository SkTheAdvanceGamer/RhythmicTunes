import { useTheme } from '../context/ThemeContext'
import { useAudioReactiveStore } from '../store/audioReactiveStore'
import { usePlayerStore } from '../store/playerStore'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

function AppLayout({ children }) {
  const { bass, mid, treble, volume } = useAudioReactiveStore()
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const { bgGradient, dominantColor } = useTheme()
  const { r, g, b } = dominantColor || { r: 13, g: 11, b: 26 }

  // Reactive subtle scale on the content area based on bass
  const reactiveScale = isPlaying ? 1 + bass * 0.003 : 1

  // Full-website visualizer effect (stays within padding, no overlap)
  const visualizerGlow = isPlaying
    ? `inset 0 ${volume * 15}px ${20 + bass * 60}px rgba(${r}, ${g}, ${b}, ${0.1 + bass * 0.4}),
       inset 0 -${volume * 15}px ${20 + bass * 60}px rgba(${r}, ${g}, ${b}, ${0.1 + bass * 0.4}),
       inset ${mid * 10}px 0 ${15 + mid * 40}px rgba(${r}, ${g}, ${b}, ${0.05 + mid * 0.25}),
       inset -${mid * 10}px 0 ${15 + mid * 40}px rgba(${r}, ${g}, ${b}, ${0.05 + mid * 0.25}),
       inset 0 0 ${10 + treble * 25}px ${treble * 5}px rgba(255, 255, 255, ${0.02 + treble * 0.1})`
    : 'none'

  return (
    <div className="relative flex min-h-svh">
      {/* Animated mesh gradient background */}
      <div className="mesh-bg" />
      <div className="beat-bg" />

      {/* Layout */}
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main
          className="flex-1 overflow-y-auto px-4 py-6 pb-24 md:px-6"
          style={{
            background: bgGradient,
            transition: 'background 1.2s ease, transform 80ms ease-out, box-shadow 100ms ease-out',
            transform: `scale(${reactiveScale})`,
            transformOrigin: 'center top',
            boxShadow: visualizerGlow,
          }}
        >
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
