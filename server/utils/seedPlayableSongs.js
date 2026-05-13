const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Artist = require("../models/Artist");
const Song = require("../models/Song");

dotenv.config();

const QUERIES = [
  "arijit singh",
  "weeknd",
  "ed sheeran",
  "dua lipa",
  "bollywood hits",
  "k-pop",
];

const searchItunes = async (term) => {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    term
  )}&entity=song&limit=30`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data.results) ? data.results : [];
};

const ensureArtist = async (name, image) => {
  const normalized = String(name || "").trim();
  if (!normalized) return null;

  let artist = await Artist.findOne({ name: normalized });
  if (!artist) {
    artist = await Artist.create({
      name: normalized,
      profileImageUrl: image || "",
      bio: "",
    });
  }
  return artist;
};

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in server/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);

  let added = 0;
  let skipped = 0;

  for (const q of QUERIES) {
    const tracks = await searchItunes(q);

    for (const track of tracks) {
      const title = String(track.trackName || "").trim();
      const artistName = String(track.artistName || "").trim();
      const fileUrl = String(track.previewUrl || "").trim();

      if (!title || !artistName || !fileUrl) {
        skipped += 1;
        continue;
      }

      const artist = await ensureArtist(artistName, track.artworkUrl100 || "");
      if (!artist) {
        skipped += 1;
        continue;
      }

      const exists = await Song.findOne({ title, artistId: artist._id });
      if (exists) {
        skipped += 1;
        continue;
      }

      await Song.create({
        title,
        artistId: artist._id,
        album: track.collectionName || "",
        genre: "Pop",
        duration: Math.round((track.trackTimeMillis || 0) / 1000),
        fileUrl,
        coverUrl: track.artworkUrl100
          ? track.artworkUrl100.replace("100x100bb", "600x600bb")
          : "",
      });
      added += 1;
    }
  }

  console.log(`Playable songs seeded. Added: ${added}, Skipped: ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("Seed failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

