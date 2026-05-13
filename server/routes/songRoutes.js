const express = require("express");
const {
  createSong,
  getAllSongs,
  getLikedSongs,
  getSongById,
  getTrendingSongs,
  likeSong,
  searchSongs,
  unlikeSong,
  deleteSong,
  externalSearchSongs,
  youtubeSearchSongs,
  youtubeResolveSong,
} = require("../controllers/songController");
const { adminOnly, protect } = require("../middleware/authMiddleware");
const { uploadAudio, uploadCover } = require("../middleware/upload");

const router = express.Router();

router.get("/", getAllSongs);
router.get("/search", searchSongs);
router.get("/external-search", protect, externalSearchSongs);
router.get("/youtube-search", protect, youtubeSearchSongs);
router.get("/youtube-resolve", protect, youtubeResolveSong);
router.get("/trending", getTrendingSongs);
router.get("/liked", protect, getLikedSongs);
router.post("/:id/like", protect, likeSong);
router.delete("/:id/like", protect, unlikeSong);
router.get("/:id", getSongById);
router.post("/", protect, adminOnly, createSong);
router.delete("/:id", protect, adminOnly, deleteSong);

// File upload routes (admin only)
router.post("/upload/audio", protect, adminOnly, uploadAudio.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No audio file uploaded." });
  }
  const fileUrl = `/uploads/audio/${req.file.filename}`;
  return res.json({ fileUrl, originalName: req.file.originalname, size: req.file.size });
});

router.post("/upload/cover", protect, adminOnly, uploadCover.single("cover"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No cover image uploaded." });
  }
  const coverUrl = `/uploads/covers/${req.file.filename}`;
  return res.json({ coverUrl, originalName: req.file.originalname, size: req.file.size });
});

module.exports = router;
