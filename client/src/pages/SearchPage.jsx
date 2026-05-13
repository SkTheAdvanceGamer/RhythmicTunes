import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import AppLayout from '../components/AppLayout'
import SongCard from '../components/SongCard'
import { useTheme } from '../context/ThemeContext'
import { usePlayerStore } from '../store/playerStore'
import { normalizeSong, normalizeSongs, formatDuration } from '../utils/songUtils'

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const { addToQueue, playSong } = usePlayerStore()
  const { accentHex } = useTheme()
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const trimmedQuery = query.trim()
    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)
      setError('')
      try {
        if (!trimmedQuery) {
          const { data } = await axiosInstance.get('/api/songs', { signal: controller.signal })
          setResults(normalizeSongs(data.songs || data))
        } else {
          const [localRes, youtubeRes] = await Promise.allSettled([
            axiosInstance.get('/api/songs/search', {
              params: { q: trimmedQuery },
              signal: controller.signal,
            }),
            axiosInstance.get('/api/songs/youtube-search', {
              params: { q: trimmedQuery },
              signal: controller.signal,
            }),
          ])

          const localSongs =
            localRes.status === 'fulfilled'
              ? normalizeSongs(localRes.value?.data?.songs || localRes.value?.data || [])
              : []
          const youtubeSongs =
            youtubeRes.status === 'fulfilled'
              ? (youtubeRes.value?.data || []).map((item) => normalizeSong(item)).filter(Boolean)
              : []

          const combined = [...localSongs]
          const seen = new Set(
            combined.map((song) => `${song.title}`.toLowerCase() + '::' + `${song.artistName}`.toLowerCase())
          )

          youtubeSongs.forEach((song) => {
            const key = `${song.title}`.toLowerCase() + '::' + `${song.artistName}`.toLowerCase()
            if (!seen.has(key)) {
              seen.add(key)
              combined.push(song)
            }
          })

          setResults(combined)
        }
      } catch (requestError) {
        if (requestError.name !== 'CanceledError') {
          setError(requestError.response?.data?.message || 'Unable to fetch songs right now.')
        }
      } finally {
        setIsLoading(false)
      }
    }, trimmedQuery ? 400 : 0)
    return () => { window.clearTimeout(timeoutId); controller.abort() }
  }, [query])

  const handlePlay = (song) => {
    playSong(song)
    results.forEach(addToQueue)
  }

  return (
    <AppLayout>
      {/* Search Hero */}
      <section className="mb-8">
        <h1 className="mb-4 text-3xl font-extrabold text-[var(--text-primary)]">Search</h1>
        <div className="relative max-w-2xl">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
            width="22" height="22" viewBox="0 0 24 24"
            fill="var(--text-muted)"
          >
            <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value
              setSearchParams(nextQuery ? { q: nextQuery } : {})
            }}
            placeholder="What do you want to listen to?"
            className="w-full rounded-full py-3.5 pl-12 pr-5 text-base font-medium text-[var(--text-primary)] outline-none transition-all duration-200"
            style={{ background: 'var(--bg-highlight)', border: '2px solid transparent' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent)' }}
            onBlur={(e) => { e.target.style.borderColor = 'transparent' }}
          />
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--danger-muted)', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : results.length ? (
        <>
          {query.trim() && (
            <h2 className="mb-4 text-xl font-bold text-[var(--text-primary)]">
              Results for "{query.trim()}"
            </h2>
          )}

          {/* Grid view for search results */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {results.map((song) => (
              <SongCard key={song._id || `${song.title}-${song.artistName}`} song={song} onPlay={handlePlay} />
            ))}
          </div>

          {/* Also show as table for quick scanning */}
          <div className="mt-8 rounded-xl p-2" style={{ background: 'var(--bg-secondary)' }}>
            <div className="grid grid-cols-[2rem_3rem_1fr_6rem] items-center gap-3 px-3 py-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
              <span>#</span>
              <span />
              <span>Title</span>
              <span className="text-right">Duration</span>
            </div>
            {results.map((song, index) => (
              <button
                key={song._id || `${song.title}-${song.artistName}-${index}`}
                type="button"
                onClick={() => handlePlay(song)}
                className="group grid w-full grid-cols-[2rem_3rem_1fr_6rem] items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-200"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--glass-bg)'
                  e.currentTarget.style.boxShadow = `0 0 0 1.5px ${accentHex}60`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                style={{ transition: 'box-shadow 0.2s ease, background 0.2s ease' }}
              >
                <span className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>{index + 1}</span>
                <img src={song.coverUrl} alt="" className="h-10 w-10 rounded object-cover" />
                <div className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{song.title}</span>
                  <span className="block truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{song.artistName}</span>
                </div>
                <span className="text-right text-sm" style={{ color: 'var(--text-muted)' }}>
                  {formatDuration(song.duration)}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="var(--text-muted)" className="mb-4 opacity-40">
            <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>
            No songs found.
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Try a different search query.
          </p>
        </div>
      )}
    </AppLayout>
  )
}

export default SearchPage
