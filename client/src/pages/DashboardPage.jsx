import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import AppLayout from '../components/AppLayout'
import FavoriteButton from '../components/FavoriteButton'
import { useAuthStore } from '../store/authStore'
import { usePlayerStore } from '../store/playerStore'
import { formatDuration, getSongId, normalizeSong, normalizeSongs } from '../utils/songUtils'

function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const { addToQueue, playSong, currentSong } = usePlayerStore()
  const [trendingSongs, setTrendingSongs] = useState([])
  const [personalizedSongs, setPersonalizedSongs] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [likedSongs, setLikedSongs] = useState([])
  const [pendingLikeSongIds, setPendingLikeSongIds] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const fetchDashboardData = async () => {
      setIsLoading(true)
      setError('')

      try {
        const [trendingResponse, personalizedResponse, playlistsResponse, likedResponse, songsResponse] = await Promise.allSettled([
          axiosInstance.get('/api/recommendations/trending'),
          axiosInstance.get('/api/recommendations/history'),
          axiosInstance.get('/api/playlists'),
          axiosInstance.get('/api/songs/liked'),
          axiosInstance.get('/api/songs?limit=30'),
        ])

        if (!isMounted) return

        const allSongs =
          songsResponse.status === 'fulfilled'
            ? normalizeSongs(songsResponse.value?.data?.songs || songsResponse.value?.data || [])
            : []

        const trending = trendingResponse.status === 'fulfilled' ? normalizeSongs(trendingResponse.value.data) : []
        const personalized =
          personalizedResponse.status === 'fulfilled'
            ? normalizeSongs(personalizedResponse.value.data)
            : []

        setTrendingSongs(trending.length ? trending : allSongs.slice(0, 12))
        setPersonalizedSongs(personalized.length ? personalized : allSongs.slice(4, 16))
        setPlaylists(playlistsResponse.status === 'fulfilled' ? playlistsResponse.value.data || [] : [])
        setLikedSongs(likedResponse.status === 'fulfilled' ? normalizeSongs(likedResponse.value.data) : [])
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load your dashboard right now.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchDashboardData()
    return () => {
      isMounted = false
    }
  }, [])

  const featuredSong = trendingSongs[0] || personalizedSongs[0] || null
  const upNextSongs = useMemo(() => trendingSongs.slice(0, 7), [trendingSongs])

  const handlePlay = (song) => {
    if (!song) return
    playSong(song)
    ;[...trendingSongs, ...personalizedSongs].forEach(addToQueue)
  }

  const handleToggleLike = async (song) => {
    const songId = getSongId(song)
    if (!songId) return

    const isLiked = likedSongs.some((likedSong) => getSongId(likedSong) === songId)
    setPendingLikeSongIds((current) => (current.includes(songId) ? current : [...current, songId]))

    try {
      if (isLiked) {
        await axiosInstance.delete(`/api/songs/${songId}/like`)
        setLikedSongs((current) => current.filter((likedSong) => getSongId(likedSong) !== songId))
      } else {
        await axiosInstance.post(`/api/songs/${songId}/like`)
        const normalizedSong = normalizeSong(song)
        if (normalizedSong) {
          setLikedSongs((current) => [normalizedSong, ...current.filter((likedSong) => getSongId(likedSong) !== songId)])
        }
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update liked songs right now.')
    } finally {
      setPendingLikeSongIds((current) => current.filter((id) => id !== songId))
    }
  }

  const currentSongId = currentSong?._id || currentSong?.id
  const likedSongIds = new Set(likedSongs.map((song) => getSongId(song)))

  const renderFavoriteButton = (song) => {
    const songId = getSongId(song)
    const isLiked = likedSongIds.has(songId)
    const isPending = pendingLikeSongIds.includes(songId)

    return (
      <FavoriteButton
        isLiked={isLiked}
        isLoading={isPending}
        onClick={() => handleToggleLike(song)}
        className="h-8 w-8"
        style={{
          color: isLiked ? '#e06060' : 'var(--text-secondary)',
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid var(--border)',
        }}
      />
    )
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <AppLayout>
      <section className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>Welcome back</p>
        <h1 className="mt-1 text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{getGreeting()}{user?.name ? `, ${user.name}` : ''}</h1>
      </section>

      {error && (
        <div className="mb-6 rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--danger-muted)', color: '#ff6b6b', border: '1px solid rgba(231,76,60,0.2)' }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : (
        <>
          <section className="mb-8 grid gap-3 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <p className="mb-2 inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ background: 'var(--accent-muted)', color: 'var(--accent-bright)' }}>Featured Now</p>
              <h2 className="text-3xl font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{featuredSong?.title || 'No tracks yet'}</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{featuredSong?.artistName || 'Start playing songs to personalize this section'}</p>
              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePlay(featuredSong)}
                  className="rounded-full px-5 py-2 text-sm font-bold"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                  disabled={!featuredSong}
                >
                  Play
                </button>
                <Link to="/search" className="rounded-full px-5 py-2 text-sm font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Explore
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-extrabold">Up Next</h3>
                <button className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }} type="button">Queue</button>
              </div>
              <div className="max-h-[340px] overflow-y-auto">
                {upNextSongs.map((song) => (
                  <button
                    key={song._id}
                    type="button"
                    onClick={() => handlePlay(song)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left"
                    style={{ background: currentSongId === song._id ? 'var(--accent-muted)' : 'transparent' }}
                  >
                    <img src={song.coverUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{song.title}</p>
                      <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{song.artistName}</p>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDuration(song.duration)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Trending Tracks</h2>
              <Link to="/search" className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>View all</Link>
            </div>
            <div className="space-y-1">
              {trendingSongs.slice(0, 8).map((song, index) => (
                <button
                  key={song._id}
                  type="button"
                  onClick={() => handlePlay(song)}
                  className="group grid w-full grid-cols-[26px_44px_1fr_58px_42px] items-center gap-3 rounded-lg px-2 py-2 text-left"
                  style={{ background: currentSongId === song._id ? 'var(--accent-muted)' : 'transparent' }}
                >
                  <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{index + 1}</span>
                  <img src={song.coverUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{song.title}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{song.artistName}</p>
                  </div>
                  <span className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>{song.playCount ? `${song.playCount}` : '--'}</span>
                  <div className="flex justify-end">{renderFavoriteButton(song)}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Albums / Playlists For You</h2>
              <Link to="/playlists" className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Browse all</Link>
            </div>
            {playlists.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {playlists.slice(0, 8).map((playlist) => (
                  <Link
                    key={playlist._id}
                    to={`/playlist/${playlist._id}`}
                    className="rounded-xl border p-3"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                  >
                    <div className="mb-3 h-28 w-full rounded-lg" style={{ background: 'var(--gradient-2)' }} />
                    <h3 className="truncate text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{playlist.playlistName}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{playlist.songs?.length || 0} songs</p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border px-6 py-8 text-center" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No playlists yet. Create one to get started.</p>
                <Link to="/playlists" className="mt-3 inline-block rounded-full px-5 py-2 text-sm font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>
                  Create playlist
                </Link>
              </div>
            )}
          </section>

          {personalizedSongs.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-extrabold">Made for You</h2>
              </div>
              <div className="horizontal-scroll">
                {personalizedSongs.slice(0, 10).map((song) => (
                  <button
                    key={song._id}
                    type="button"
                    onClick={() => handlePlay(song)}
                    className="w-40 rounded-xl border p-2 text-left"
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
                  >
                    <img src={song.coverUrl} alt="" className="mb-2 h-32 w-full rounded-lg object-cover" />
                    <p className="truncate text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{song.title}</p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>{song.artistName}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AppLayout>
  )
}

export default DashboardPage
