import { useEffect, useState } from 'react'
import axiosInstance from '../api/axiosInstance'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import { usePlayerStore } from '../store/playerStore'
import { normalizeSong } from '../utils/songUtils'

function ExplorePage() {
  const { user } = useAuthStore()
  const { playSong, setQueue } = usePlayerStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!query.trim()) {
      const fetchLocalDb = async () => {
        setIsLoading(true)
        setError('')
        try {
          const { data } = await axiosInstance.get('/api/songs')
          const songArray = data.songs || data;
          const normalized = songArray.map(song => {
            const n = normalizeSong(song)
            if (!n) return null
            return {
              title: n.title,
              artist: n.artistName || 'Unknown',
              image: n.coverUrl,
              streamUrl: n.fileUrl,
              duration: n.duration || 0,
              isLocal: true
            }
          }).filter(Boolean)
          setResults(normalized)
        } catch (err) {
          console.error('Failed to load local DB catalog', err)
        } finally {
          setIsLoading(false)
        }
      }
      fetchLocalDb()
    }
  }, [query])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    setError('')
    try {
      const { data } = await axiosInstance.get(`/api/songs/youtube-search?q=${encodeURIComponent(query)}`)
      const mapped = (data || []).map((item) => ({
        title: item.title,
        artist: item.artistName || item.artist || 'YouTube Artist',
        image: item.coverUrl || '',
        streamUrl: item.fileUrl || '',
        youtubeVideoId: item.youtubeVideoId || '',
        duration: item.duration || 0,
        isLocal: false,
      }))
      setResults(mapped)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch external songs')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlay = (track) => {
    if (!track.streamUrl && !track.youtubeVideoId) {
      setError('No playable source available for this track.')
      setTimeout(() => setError(''), 4000)
      return
    }

    const mockSong = {
      _id: `external-${Math.random()}`,
      title: track.title,
      artistId: { name: track.artist },
      artistName: track.artist,
      coverUrl: track.image,
      fileUrl: track.streamUrl,
      youtubeVideoId: track.youtubeVideoId,
      duration: track.duration
    }

    // Play as a single track queue
    setQueue([mockSong])
    playSong(mockSong)
  }

  const handleSaveToLibrary = async (track) => {
    if (!track.streamUrl) {
      setError('Only preview-based tracks can be saved to DB directly.')
      setTimeout(() => setError(''), 4000)
      return
    }

    try {
      // 1. Fetch all artists to match
      const { data: allArtists } = await axiosInstance.get('/api/artists')
      let artist = allArtists.find(a => a.name.toLowerCase() === track.artist.toLowerCase())

      // 2. Create artist if not exists
      if (!artist) {
        const { data: newArtist } = await axiosInstance.post('/api/artists', {
          name: track.artist,
          profileImageUrl: track.image
        })
        artist = newArtist
      }

      // 3. Create song in standard library
      await axiosInstance.post('/api/songs', {
        title: track.title,
        artistId: artist._id,
        duration: track.duration,
        fileUrl: track.streamUrl,
        coverUrl: track.image,
        genre: 'External'
      })

      setSuccess(`Successfully added "${track.title}" to local library!`)
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save track to library.')
      setTimeout(() => setError(''), 4000)
    }
  }

  return (
    <AppLayout>
      <section className="mb-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: 'var(--gradient-violet)', boxShadow: '0 0 20px rgba(207,159,255,0.3)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0d0b1a">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Explore Online</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Search external catalogs and previews globally</p>
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <section className="mb-8">
        <form onSubmit={handleSearch} className="flex max-w-2xl items-center gap-3 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists, songs, or albums..."
            className="w-full rounded-full py-4 pl-12 pr-6 text-sm font-semibold outline-none transition-all focus:scale-[1.01]"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-primary)',
            }}
          />
          <svg className="absolute left-5 top-1/2 -translate-y-1/2" width="20" height="20" viewBox="0 0 24 24" fill="var(--text-secondary)">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          
          <button type="submit" disabled={isLoading} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-6 py-2 text-sm font-bold transition hover:scale-105 disabled:opacity-60"
            style={{ background: 'var(--gradient-violet)', color: '#0d0b1a' }}>
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </section>

      {/* Results */}
      <section>
        {error && <div className="mb-6 rounded-lg bg-red-500/10 p-4 text-sm text-red-500">{error}</div>}
        {success && <div className="mb-6 rounded-lg p-4 text-sm font-semibold" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{success}</div>}

        {results.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((track, i) => (
              <div key={i} className="glass-card group relative flex flex-col rounded-xl p-4 transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="relative mb-4 aspect-square overflow-hidden rounded-lg">
                  <img src={track.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80'} alt={track.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 grid place-items-center">
                    <button onClick={() => handlePlay(track)} className="grid h-12 w-12 place-items-center rounded-full transition-transform hover:scale-110" style={{ background: 'var(--gradient-violet)', color: '#0d0b1a' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="truncate text-base font-bold" style={{ color: 'var(--text-primary)' }} title={track.title}>{track.title}</h3>
                  <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{track.artist}</p>
                </div>

                {(user?.isAdmin || user?.role === 'admin' || user?.role === 'staff') && !track.isLocal && track.streamUrl && (
                  <button 
                    onClick={() => handleSaveToLibrary(track)}
                    className="mt-4 w-full rounded-lg py-2 text-xs font-bold transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                  >
                    Add to Library
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  )
}

export default ExplorePage
