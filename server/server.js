const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const analyticsRoutes = require("./routes/analyticsRoutes");
const artistRoutes = require("./routes/artistRoutes");
const authRoutes = require("./routes/authRoutes");
const historyRoutes = require("./routes/historyRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const songRoutes = require("./routes/songRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve uploaded files (audio, covers) as static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/artists", artistRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/users", userRoutes);
app.use('/songs', express.static('uploads/audio'));
app.use('/covers', express.static('uploads/covers'));

// Serve prebuilt frontend so the app can run without Vite in constrained environments
const clientDistPath = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDistPath));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get(/^\/(?!api|uploads|songs|covers).*/, (req, res) => {
  return res.sendFile(path.join(clientDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`RhythmicTunes server running on port ${PORT}`);
});
