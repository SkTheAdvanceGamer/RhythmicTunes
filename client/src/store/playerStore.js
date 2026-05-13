import { create } from 'zustand'
import { getSongId } from '../utils/songUtils'

const findCurrentIndex = (queue, currentSong) =>
  queue.findIndex((song) => getSongId(song) === getSongId(currentSong))

const isPlayableSong = (song) =>
  Boolean(
    (song?.fileUrl && String(song.fileUrl).trim()) ||
      (song?.youtubeVideoId && String(song.youtubeVideoId).trim())
  )

export const usePlayerStore = create((set, get) => ({
  currentSong: null,
  queue: [],
  isPlaying: false,
  clearPlayer: () => {
    set({ currentSong: null, queue: [], isPlaying: false })
  },
  setQueue: (songs = []) => {
    const normalizedQueue = Array.isArray(songs) ? songs.filter(Boolean) : []
    const playableQueue = normalizedQueue.filter(isPlayableSong)
    const { currentSong, isPlaying } = get()
    const hasCurrentInQueue =
      currentSong &&
      playableQueue.some((song) => getSongId(song) === getSongId(currentSong))

    set({
      queue: playableQueue,
      currentSong: hasCurrentInQueue ? currentSong : playableQueue[0] || null,
      isPlaying: hasCurrentInQueue ? isPlaying : playableQueue.length > 0,
    })
  },
  playSong: (song) => {
    if (!isPlayableSong(song)) {
      return
    }

    const { queue } = get()
    const songExists = queue.some((queueSong) => getSongId(queueSong) === getSongId(song))

    set({
      currentSong: song,
      queue: songExists ? queue : [...queue, song],
      isPlaying: true,
    })
  },
  pauseSong: () => {
    set({ isPlaying: false })
  },
  nextSong: () => {
    const { currentSong, queue } = get()

    if (!queue.length) {
      return
    }

    const currentIndex = findCurrentIndex(queue, currentSong)
    let nextIndex = -1

    if (currentIndex === -1) {
      nextIndex = queue.findIndex(isPlayableSong)
    } else {
      for (let i = currentIndex + 1; i < queue.length; i += 1) {
        if (isPlayableSong(queue[i])) {
          nextIndex = i
          break
        }
      }
    }

    if (nextIndex === -1) {
      set({ isPlaying: false })
      return
    }

    set({
      currentSong: queue[nextIndex],
      isPlaying: true,
    })
  },
  prevSong: () => {
    const { currentSong, queue } = get()

    if (!queue.length) {
      return
    }

    const currentIndex = findCurrentIndex(queue, currentSong)
    let prevIndex = -1

    if (currentIndex === -1) {
      for (let i = queue.length - 1; i >= 0; i -= 1) {
        if (isPlayableSong(queue[i])) {
          prevIndex = i
          break
        }
      }
    } else {
      for (let i = currentIndex - 1; i >= 0; i -= 1) {
        if (isPlayableSong(queue[i])) {
          prevIndex = i
          break
        }
      }
    }

    if (prevIndex === -1) {
      set({ isPlaying: false })
      return
    }

    set({
      currentSong: queue[prevIndex],
      isPlaying: true,
    })
  },
  addToQueue: (song) => {
    if (!isPlayableSong(song)) {
      return
    }

    const { queue } = get()
    const songExists = queue.some((queueSong) => getSongId(queueSong) === getSongId(song))

    if (!songExists) {
      set({ queue: [...queue, song] })
    }
  },
}))
