const mongoose = require("mongoose");
const Artist = require("../models/Artist");
const ListeningHistory = require("../models/ListeningHistory");
const Song = require("../models/Song");
const User = require("../models/User");
const { searchSpotifyTracks } = require("../services/spotifyService");
const { searchYouTubeSongs } = require("../services/youtubeService");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAllSongs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [songs, total] = await Promise.all([
      Song.find()
        .populate("artistId", "name")
        .sort({ releaseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Song.countDocuments(),
    ]);

    return res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      songs,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch songs.", error: error.message });
  }
};

const getSongById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid song ID." });
    }

    const song = await Song.findById(req.params.id).populate("artistId", "name");

    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    return res.json(song);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch song.", error: error.message });
  }
};

const searchSongs = async (req, res) => {
  try {
    const query = (req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({ message: "Search query is required." });
    }

    const searchRegex = new RegExp(escapeRegex(query), "i");
    const songs = await Song.find({
      $or: [{ title: searchRegex }, { genre: searchRegex }],
    })
      .populate("artistId", "name")
      .sort({ releaseDate: -1, createdAt: -1 });

    return res.json(songs);
  } catch (error) {
    return res.status(500).json({ message: "Failed to search songs.", error: error.message });
  }
};

const externalSearchSongs = async (req, res) => {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      return res.status(400).json({ message: "Search query is required." });
    }
    const results = await searchSpotifyTracks(query);
    return res.json(results);
  } catch (error) {
    return res.status(500).json({ message: "External search failed.", error: error.message });
  }
};

const youtubeSearchSongs = async (req, res) => {
  try {
    const query = (req.query.q || "").trim();
    if (!query) {
      return res.status(400).json({ message: "Search query is required." });
    }

    const results = await searchYouTubeSongs(query, 12);
    return res.json(results);
  } catch (error) {
    return res.status(502).json({
      message: "Unable to fetch YouTube tracks right now.",
      error: error.message,
    });
  }
};

const youtubeResolveSong = async (req, res) => {
  try {
    const title = String(req.query.title || "").trim();
    const artist = String(req.query.artist || "").trim();
    const query = `${title} ${artist}`.trim();

    if (!query) {
      return res.status(400).json({ message: "Song title or artist is required." });
    }

    const results = await searchYouTubeSongs(query, 1);
    if (!results.length) {
      return res.status(404).json({ message: "No playable YouTube match found." });
    }

    return res.json(results[0]);
  } catch (error) {
    return res.status(502).json({
      message: "Unable to resolve this song from YouTube right now.",
      error: error.message,
    });
  }
};

const createSong = async (req, res) => {
  try {
    const { title, artistId, album, genre, duration, releaseDate, fileUrl, coverUrl } = req.body;

    if (!title || !artistId || duration === undefined || duration === null || !fileUrl) {
      return res.status(400).json({
        message: "Title, artistId, duration, and fileUrl are required.",
      });
    }

    if (!mongoose.isValidObjectId(artistId)) {
      return res.status(400).json({ message: "Invalid artist ID." });
    }

    const artist = await Artist.findById(artistId);

    if (!artist) {
      return res.status(404).json({ message: "Artist not found." });
    }

    const durationInSeconds = Number(duration);

    if (Number.isNaN(durationInSeconds) || durationInSeconds < 0) {
      return res.status(400).json({ message: "Duration must be a non-negative number." });
    }

    let parsedReleaseDate;
    if (releaseDate) {
      parsedReleaseDate = new Date(releaseDate);

      if (Number.isNaN(parsedReleaseDate.getTime())) {
        return res.status(400).json({ message: "Release date must be a valid date." });
      }
    }

    const song = await Song.create({
      title,
      artistId,
      album,
      genre,
      duration: durationInSeconds,
      ...(parsedReleaseDate ? { releaseDate: parsedReleaseDate } : {}),
      fileUrl,
      coverUrl,
    });

    await song.populate("artistId", "name");

    return res.status(201).json(song);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create song.", error: error.message });
  }
};

const getTrendingSongs = async (req, res) => {
  try {
    const playCounts = await ListeningHistory.aggregate([
      {
        $group: {
          _id: "$songId",
          playCount: { $sum: 1 },
        },
      },
      { $sort: { playCount: -1 } },
      { $limit: 10 },
    ]);

    const songIds = playCounts.map((item) => item._id).filter(Boolean);
    const songs = await Song.find({ _id: { $in: songIds } }).populate("artistId", "name");
    const songById = new Map(songs.map((song) => [song._id.toString(), song]));

    const trendingSongs = playCounts
      .map((item) => {
        const song = songById.get(item._id.toString());

        if (!song) {
          return null;
        }

        return {
          playCount: item.playCount,
          song,
        };
      })
      .filter(Boolean);

    return res.json(trendingSongs);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch trending songs.", error: error.message });
  }
};

const likeSong = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid song ID." });
    }

    const song = await Song.findById(req.params.id).select("_id");

    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { likedSongs: song._id },
    });

    return res.json({
      liked: true,
      songId: song._id,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to like song.", error: error.message });
  }
};

const unlikeSong = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid song ID." });
    }

    const song = await Song.findById(req.params.id).select("_id");

    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { likedSongs: song._id },
    });

    return res.json({
      liked: false,
      songId: song._id,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to unlike song.", error: error.message });
  }
};

const getLikedSongs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("likedSongs")
      .populate({
        path: "likedSongs",
        populate: {
          path: "artistId",
          select: "name",
        },
      });

    return res.json(user?.likedSongs || []);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch liked songs.", error: error.message });
  }
};

const deleteSong = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid song ID." });
    }

    const song = await Song.findById(req.params.id);
    if (!song) {
      return res.status(404).json({ message: "Song not found." });
    }

    await Song.findByIdAndDelete(req.params.id);
    return res.json({ message: "Song deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete song.", error: error.message });
  }
};

module.exports = {
  createSong,
  deleteSong,
  externalSearchSongs,
  getAllSongs,
  getLikedSongs,
  getSongById,
  getTrendingSongs,
  likeSong,
  searchSongs,
  youtubeSearchSongs,
  youtubeResolveSong,
  unlikeSong,
};
