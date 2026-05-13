import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'
import { useTheme } from '../context/ThemeContext'
import { connectAudioAnalyser, startYouTubeSimulation, stopYouTubeSimulation, useAudioReactiveStore } from '../store/audioReactiveStore'
import { usePlayerStore } from '../store/playerStore'
import { defaultCoverUrl, formatDuration, getSongId } from '../utils/songUtils'

const isMongoId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''))
const isLikelyPreviewTrack = (song) => {
  if (!song || song.youtubeVideoId || !song.fileUrl) return false
  const duration = Number(song.duration || 0)
  const previewPattern = /(preview|p\.scdn\.co|audio-ssl\.itunes|mzstatic\.com)/i
  return (duration > 0 && duration <= 45) || previewPattern.test(String(song.fileUrl))
}

const loadYouTubeApi = () =>
  new Promise((resolve, reject) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT)
      return
    }

    const existingScript = document.querySelector('script[data-yt-iframe-api="1"]')
    if (!existingScript) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      script.async = true
      script.dataset.ytIframeApi = '1'
      document.body.appendChild(script)
    }

    const timeout = setTimeout(() => reject(new Error('YouTube API load timeout')), 10000)
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout)
      if (typeof prev === 'function') prev()
      resolve(window.YT)
    }
  })

function MusicPlayer() {
  const audioRef = useRef(null)
  const ytContainerRef = useRef(null)
  const ytPlayerRef = useRef(null)
  const ytProgressTimerRef = useRef(null)
  const ytResolveAttemptedRef = useRef(new Set())
  const loggedSongIdRef = useRef(null)
  const prevSongIdRef = useRef(null)
  const analyserConnectedRef = useRef(false)
  const { currentSong, isPlaying, nextSong, pauseSong, playSong, prevSong } = usePlayerStore()
  const { bass, volume: audioVolume } = useAudioReactiveStore()
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const { accentHex } = useTheme()

  const songId = getSongId(currentSong)
  const isYouTubeSong = Boolean(currentSong?.youtubeVideoId)

  const resolveSongToYouTube = useCallback(
    async (song) => {
      const candidateId = getSongId(song)
      if (!song || !candidateId) return false
      if (song.youtubeVideoId) return true
      if (ytResolveAttemptedRef.current.has(candidateId)) return false

      ytResolveAttemptedRef.current.add(candidateId)

      try {
        const { data } = await axiosInstance.get('/api/songs/youtube-resolve', {
          params: {
            title: song.title,
            artist: song.artistName || song.artistId?.name,
          },
        })

        if (!data?.youtubeVideoId) return false

        playSong({
          ...song,
          youtubeVideoId: data.youtubeVideoId,
          coverUrl: data.coverUrl || song.coverUrl,
          duration: Number(data.duration) || Number(song.duration) || 0,
        })
        return true
      } catch (_) {
        return false
      }
    },
    [playSong]
  )

  const clearYtTimer = () => {
    if (ytProgressTimerRef.current) {
      clearInterval(ytProgressTimerRef.current)
      ytProgressTimerRef.current = null
    }
  }

  const startYtTimer = () => {
    clearYtTimer()
    ytProgressTimerRef.current = setInterval(() => {
      const ytPlayer = ytPlayerRef.current
      if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return
      setCurrentTime(ytPlayer.getCurrentTime() || 0)
      const d = ytPlayer.getDuration?.() || 0
      if (d > 0) setDuration(d)
    }, 500)
  }

  useEffect(() => () => clearYtTimer(), [])

  // Apply audio-reactive CSS variables to :root
  const rafRef = useRef(null)
  const applyReactiveCSS = useCallback(() => {
    const store = useAudioReactiveStore.getState()
    const root = document.documentElement
    root.style.setProperty('--audio-bass', store.bass.toFixed(3))
    root.style.setProperty('--audio-mid', store.mid.toFixed(3))
    root.style.setProperty('--audio-treble', store.treble.toFixed(3))
    root.style.setProperty('--audio-volume', store.volume.toFixed(3))
    rafRef.current = requestAnimationFrame(applyReactiveCSS)
  }, [])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(applyReactiveCSS)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [applyReactiveCSS])

  // Volume sync
  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = volume

    const ytPlayer = ytPlayerRef.current
    if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
      ytPlayer.setVolume(Math.round(volume * 100))
    }
  }, [volume])

  // Connect audio analyser once when we first play HTML audio
  const connectAnalyser = useCallback(() => {
    if (!analyserConnectedRef.current && audioRef.current) {
      connectAudioAnalyser(audioRef.current)
      analyserConnectedRef.current = true
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    const ytPlayer = ytPlayerRef.current

    if (isYouTubeSong) {
      if (audio) audio.pause()
      return
    }

    // Switching away from YouTube — stop simulation
    stopYouTubeSimulation()
    clearYtTimer()
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
      ytPlayer.pauseVideo()
    }

    if (!audio) return
    if (!currentSong?.fileUrl) {
      pauseSong()
      return
    }

    if (prevSongIdRef.current !== songId) {
      audio.src = currentSong.fileUrl
      audio.load()
      prevSongIdRef.current = songId
      setCurrentTime(0)
      setDuration(0)
    }

    if (isPlaying) {
      connectAnalyser()
      audio.play().catch(async () => {
        const switched = await resolveSongToYouTube(currentSong)
        if (!switched) {
          pauseSong()
        }
      })
    } else {
      audio.pause()
    }
  }, [currentSong, isPlaying, songId, pauseSong, connectAnalyser, isYouTubeSong, resolveSongToYouTube])

  useEffect(() => {
    if (!isYouTubeSong || !currentSong?.youtubeVideoId || !ytContainerRef.current) return

    let cancelled = false

    const setup = async () => {
      try {
        const YT = await loadYouTubeApi()
        if (cancelled) return

        if (!ytPlayerRef.current) {
          ytPlayerRef.current = new YT.Player(ytContainerRef.current, {
            height: '0',
            width: '0',
            videoId: currentSong.youtubeVideoId,
            playerVars: {
              autoplay: 0,
              controls: 0,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              fs: 0,
              iv_load_policy: 3,
            },
            events: {
              onReady: () => {
                if (!ytPlayerRef.current) return
                ytPlayerRef.current.setVolume(Math.round(volume * 100))
                const d = ytPlayerRef.current.getDuration?.() || 0
                if (d > 0) setDuration(d)
                if (isPlaying) ytPlayerRef.current.playVideo()
              },
              onStateChange: (event) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  startYtTimer()
                  startYouTubeSimulation()
                }
                if (event.data === window.YT.PlayerState.PAUSED) {
                  clearYtTimer()
                  stopYouTubeSimulation()
                }
                if (event.data === window.YT.PlayerState.ENDED) {
                  clearYtTimer()
                  stopYouTubeSimulation()
                  nextSong()
                }
              },
              onError: () => {
                clearYtTimer()
                pauseSong()
                nextSong()
              },
            },
          })
        } else {
          ytPlayerRef.current.loadVideoById(currentSong.youtubeVideoId)
        }

        setCurrentTime(0)
        setDuration(Number(currentSong.duration) || 0)
        if (isPlaying && ytPlayerRef.current?.playVideo) {
          ytPlayerRef.current.playVideo()
        } else if (ytPlayerRef.current?.pauseVideo) {
          ytPlayerRef.current.pauseVideo()
        }
      } catch (_) {
        const switched = await resolveSongToYouTube(currentSong)
        if (!switched) {
          pauseSong()
        }
      }
    }

    setup()

    return () => {
      cancelled = true
    }
  }, [currentSong, currentSong?.youtubeVideoId, isPlaying, nextSong, pauseSong, volume, isYouTubeSong, resolveSongToYouTube])

  useEffect(() => {
    if (!isYouTubeSong) return
    const ytPlayer = ytPlayerRef.current
    if (!ytPlayer) return

    if (isPlaying) {
      ytPlayer.playVideo?.()
      startYouTubeSimulation()
    } else {
      ytPlayer.pauseVideo?.()
      stopYouTubeSimulation()
    }
  }, [isPlaying, isYouTubeSong])

  // Auto-upgrade short preview tracks to full YouTube playback.
  useEffect(() => {
    if (!currentSong || !songId || currentSong.youtubeVideoId) return
    if (!isLikelyPreviewTrack(currentSong)) return
    resolveSongToYouTube(currentSong)
  }, [currentSong, songId, resolveSongToYouTube])

  // Log play to history only for DB songs
  useEffect(() => {
    if (!isPlaying || !songId || !isMongoId(songId) || loggedSongIdRef.current === songId) return
    loggedSongIdRef.current = songId
    axiosInstance.post('/api/history', { songId }).catch(() => {
      loggedSongIdRef.current = null
    })
  }, [isPlaying, songId])

  useEffect(() => {
    loggedSongIdRef.current = null
  }, [songId])

  const togglePlayback = () => {
    if (!currentSong) return
    if (isPlaying) pauseSong()
    else playSong(currentSong)
  }

  const handleSeek = (e) => {
    const t = Number(e.target.value)
    if (isYouTubeSong) {
      ytPlayerRef.current?.seekTo?.(t, true)
    } else if (audioRef.current) {
      audioRef.current.currentTime = t
    }
    setCurrentTime(t)
  }

  const displayDuration = duration || Number(currentSong?.duration) || 0
  const progress = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0

  // Reactive styles for the player bar
  const reactiveGlow = isPlaying
    ? `0 -4px ${20 + bass * 30}px rgba(207, 159, 255, ${0.1 + audioVolume * 0.25})`
    : 'none'
  const reactiveBorder = isPlaying ? `rgba(207, 159, 255, ${0.1 + bass * 0.35})` : 'var(--border)'

  if (!currentSong) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-30"
        style={{
          background: 'rgba(13, 11, 26, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: '1px solid var(--border)',
          height: 72,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Choose a song to start listening
          </span>
        </div>
      </div>
    )
  }

  const content = (
    <div className="flex items-center transition-opacity hover:opacity-80" style={{ minWidth: 200, gap: 12 }}>
      <div className="relative flex-shrink-0">
        <img
          src={currentSong.coverUrl || defaultCoverUrl}
          alt={`${currentSong.title} cover`}
          style={{
            width: 44,
            height: 44,
            borderRadius: 6,
            objectFit: 'cover',
            boxShadow: isPlaying
              ? `0 0 ${12 + bass * 20}px rgba(207, 159, 255, ${0.2 + bass * 0.4})`
              : '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'box-shadow 100ms ease-out',
          }}
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = defaultCoverUrl
          }}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold transition-colors" style={{ color: 'var(--text-primary)' }}>
          {currentSong.title}
        </p>
        <p className="truncate text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          {currentSong.artistName}
        </p>
      </div>
    </div>
  )

  return (
    <>
      <div
        ref={ytContainerRef}
        style={{ position: 'fixed', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
      />

      {isPlaying && (
        <div className="visualizer-bar">
          <div className="bar-fill" style={{ width: `${Math.max(audioVolume * 100, 2)}%` }} />
        </div>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-30"
        style={{
          background: 'rgba(13, 11, 26, 0.9)',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
          borderTop: `1px solid ${reactiveBorder}`,
          boxShadow: reactiveGlow,
          transition: 'box-shadow 100ms ease-out, border-color 100ms ease-out',
          height: 72,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <audio
          ref={audioRef}
          crossOrigin="anonymous"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onError={async () => {
            const switched = await resolveSongToYouTube(currentSong)
            if (!switched) {
              pauseSong()
              nextSong()
            }
          }}
          onEnded={nextSong}
        />

        <div className="mx-auto grid max-w-7xl grid-cols-[1fr_2fr_1fr] items-center gap-3">
          {isMongoId(songId) ? <Link to={`/song/${songId}`}>{content}</Link> : content}

          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center" style={{ gap: 20 }}>
              <button
                type="button"
                onClick={prevSong}
                className="grid h-7 w-7 place-items-center rounded-full transition-all duration-200 hover:scale-110"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={togglePlayback}
                disabled={!currentSong.fileUrl && !currentSong.youtubeVideoId}
                className="grid h-9 w-9 place-items-center rounded-full transition-all duration-200 hover:scale-110 disabled:opacity-60"
                style={{
                  background: 'var(--accent)',
                  boxShadow: isPlaying
                    ? `0 0 ${16 + bass * 20}px rgba(207,159,255,${0.3 + bass * 0.4})`
                    : '0 0 12px rgba(207,159,255,0.2)',
                  transition: 'box-shadow 100ms ease-out, transform 200ms ease',
                }}
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0d0b1a">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0d0b1a">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={nextSong}
                className="grid h-7 w-7 place-items-center rounded-full transition-all duration-200 hover:scale-110"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            <div
              className="flex w-full max-w-md items-center text-[10px] font-medium"
              style={{ color: 'var(--text-muted)', margin: '0 24px' }}
            >
              <span className="w-7 text-right">{formatDuration(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={displayDuration}
                value={Math.min(currentTime, displayDuration)}
                onChange={handleSeek}
                className="accent-violet flex-1"
                style={{
                  '--progress': `${progress}%`,
                  margin: '0 8px',
                  height: 3,
                  borderRadius: 2,
                  accentColor: accentHex,
                }}
              />
              <span className="w-7">{formatDuration(displayDuration)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--text-secondary)">
              {volume === 0 ? (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              ) : volume < 0.5 ? (
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
              ) : (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              )}
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              style={{
                width: 80,
                maxWidth: 80,
                accentColor: accentHex,
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export default MusicPlayer
