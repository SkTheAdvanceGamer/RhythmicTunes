const mongoose = require("mongoose");
require("../models/Artist");
const Playlist = require("../models/Playlist");
const Song = require("../models/Song");

const populatePlaylistSongs = (query) =>
  query.populate({
    path: "songs",
    select: "title artistId coverUrl duration fileUrl genre",
    populate: {
      path: "artistId",
      select: "name",
    },
  });

const getPlaylistForOwner = async (playlistId, userId) => {
  if (!mongoose.isValidObjectId(playlistId)) {
    return { status: 400, message: "Invalid playlist ID." };
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    return { status: 404, message: "Playlist not found." };
  }

  if (playlist.userId.toString() !== userId.toString()) {
    return { status: 403, message: "You do not have permission to modify this playlist." };
  }

  return { playlist };
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return Boolean(value);
};

const normalizePlaylistName = (value) => (typeof value === "string" ? value.trim() : "");

const getUserPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.json(playlists);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch playlists.", error: error.message });
  }
};

const createPlaylist = async (req, res) => {
  try {
    const { playlistName, isPublic } = req.body;
    const normalizedPlaylistName = normalizePlaylistName(playlistName);

    if (!normalizedPlaylistName) {
      return res.status(400).json({ message: "Playlist name is required." });
    }

    const playlist = await Playlist.create({
      userId: req.user._id,
      playlistName: normalizedPlaylistName,
      isPublic: parseBoolean(isPublic),
    });

    return res.status(201).json(playlist);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create playlist.", error: error.message });
  }
};

const getPlaylistById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid playlist ID." });
    }

    const playlist = await populatePlaylistSongs(Playlist.findById(req.params.id));

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found." });
    }

    return res.json(playlist);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch playlist.", error: error.message });
  }
};

const updatePlaylist = async (req, res) => {
  try {
    const result = await getPlaylistForOwner(req.params.id, req.user._id);

    if (!result.playlist) {
      return res.status(result.status).json({ message: result.message });
    }

    const { playlistName, isPublic } = req.body;

    if (playlistName !== undefined) {
      const normalizedPlaylistName = normalizePlaylistName(playlistName);

      if (!normalizedPlaylistName) {
        return res.status(400).json({ message: "Playlist name cannot be empty." });
      }

      result.playlist.playlistName = normalizedPlaylistName;
    }

    if (isPublic !== undefined) {
      result.playlist.isPublic = parseBoolean(isPublic);
    }

    await result.playlist.save();

    return res.json(result.playlist);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update playlist.", error: error.message });
  }
};

const deletePlaylist = async (req, res) => {
  try {
    const result = await getPlaylistForOwner(req.params.id, req.user._id);

    if (!result.playlist) {
      return res.status(result.status).json({ message: result.message });
    }

    await result.playlist.deleteOne();

    return res.json({ message: "Playlist deleted." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete playlist.", error: error.message });
  }
};

const addSongToPlaylist = async (req, res) => {
  try {
    const result = await getPlaylistForOwner(req.params.id, req.user._id);

    if (!result.playlist) {
      return res.status(result.status).json({ message: result.message });
    }

    const { songId } = req.body;

    if (!songId || !mongoose.isValidObjectId(songId)) {
      return res.status(400).json({ message: "Valid songId is required." });
    }

    const song = await Song.findById(songId);

    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    const hasSong = result.playlist.songs.some(
      (playlistSongId) => playlistSongId.toString() === song._id.toString()
    );

    if (!hasSong) {
      result.playlist.songs.push(song._id);
      await result.playlist.save();
    }

    await result.playlist.populate({
      path: "songs",
      select: "title artistId coverUrl duration fileUrl genre",
      populate: {
        path: "artistId",
        select: "name",
      },
    });

    return res.json(result.playlist);
  } catch (error) {
    return res.status(500).json({ message: "Failed to add song to playlist.", error: error.message });
  }
};

const removeSongFromPlaylist = async (req, res) => {
  try {
    const result = await getPlaylistForOwner(req.params.id, req.user._id);

    if (!result.playlist) {
      return res.status(result.status).json({ message: result.message });
    }

    if (!mongoose.isValidObjectId(req.params.songId)) {
      return res.status(400).json({ message: "Invalid song ID." });
    }

    result.playlist.songs = result.playlist.songs.filter(
      (songId) => songId.toString() !== req.params.songId
    );

    await result.playlist.save();
    await result.playlist.populate({
      path: "songs",
      select: "title artistId coverUrl duration fileUrl genre",
      populate: {
        path: "artistId",
        select: "name",
      },
    });

    return res.json(result.playlist);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to remove song from playlist.", error: error.message });
  }
};

module.exports = {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeSongFromPlaylist,
  updatePlaylist,
};
