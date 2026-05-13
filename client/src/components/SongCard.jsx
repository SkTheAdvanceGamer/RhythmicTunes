import { useTheme } from '../context/ThemeContext'
import { useAudioReactiveStore } from '../store/audioReactiveStore'
import { usePlayerStore } from '../store/playerStore'
import { defaultCoverUrl, formatDuration } from '../utils/songUtils'

function SongCard({ song, onPlay, favoriteButton = null }) {
  const { bass } = useAudioReactiveStore()
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentSong = usePlayerStore((s) => s.currentSong)
  const { dominantColor, accentHex } = useTheme()
  const isCurrent = (currentSong?._id || currentSong?.id) === song._id

  const reactiveGlow = isCurrent && isPlaying
    ? `0 4px ${16 + bass * 25}px rgba(207, 159, 255, ${0.15 + bass * 0.3}), inset 0 1px 0 rgba(255,255,255,0.06)`
    : 'var(--shadow-card)'

  const reactiveBorder = isCurrent && isPlaying
    ? `rgba(207, 159, 255, ${0.2 + bass * 0.4})`
    : 'var(--border)'

  return (
    <button
      type="button"
      onClick={() => onPlay(song)}
      className="group relative flex w-44 flex-shrink-0 flex-col overflow-hidden rounded-xl p-3 text-left transition-all duration-300"
      style={{
        background: isCurrent && isPlaying
          ? `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.08)`
          : 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: `1px solid ${reactiveBorder}`,
        borderLeft: isCurrent && isPlaying ? `3px solid ${accentHex}` : `1px solid ${reactiveBorder}`,
        boxShadow: reactiveGlow,
        transform: isCurrent && isPlaying ? `scale(${1 + bass * 0.015})` : 'scale(1)',
        transition: 'transform 80ms ease-out, box-shadow 100ms ease-out, border-color 100ms ease-out',
      }}
    >
      {favoriteButton && (
        <div className="absolute right-3 top-3 z-10">
          {favoriteButton}
        </div>
      )}

      {/* Cover Art */}
      <div className="relative mb-3 overflow-hidden rounded-lg">
        <img
          src={song.coverUrl || defaultCoverUrl}
          alt={`${song.title} cover`}
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = defaultCoverUrl
          }}
        />
        <div
          className="absolute bottom-2 right-2 grid h-10 w-10 place-items-center rounded-full opacity-0 shadow-xl transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          style={{ background: 'var(--accent)', transform: 'translateY(8px)', boxShadow: '0 4px 20px rgba(207,159,255,0.4)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#0d0b1a"><path d="M8 5v14l11-7z" /></svg>
        </div>
      </div>

      <span className="block truncate text-sm font-bold" style={{ color: isCurrent ? accentHex : 'var(--text-primary)' }}>{song.title}</span>
      <span className="mt-1 block truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{song.artistName}</span>
      <span className="mt-2 inline-block self-start rounded-full px-2 py-0.5 text-[10px] font-semibold"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
      >
        {formatDuration(song.duration)}
      </span>
    </button>
  )
}

export default SongCard
