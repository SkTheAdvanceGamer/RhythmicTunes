# RhythmicTunes

<div align="center">

### Your Melodic Companion

A full-stack MERN music platform with a modern reactive UI, YouTube-powered discovery, playlists, history, recommendations, and role-based admin tools.

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-ff8a3d?style=for-the-badge)](#frontend)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-2f2f2f?style=for-the-badge)](#backend)
[![Database](https://img.shields.io/badge/Database-MongoDB-1f1f1f?style=for-the-badge)](#database)
[![Auth](https://img.shields.io/badge/Auth-JWT%20%2B%20bcryptjs-6b4b2a?style=for-the-badge)](#authentication)

</div>

---

## Overview
RhythmicTunes is a production-style MERN app designed for music exploration and playback with a Spotify-like experience. It combines:

1. A responsive, glassmorphic-reactive frontend.
2. A scalable REST API backend.
3. Personalized recommendations from listening behavior.
4. YouTube-backed dynamic search and playback integration.

## Highlights
1. Beautiful v3 UI shell (icon sidebar, floating player aesthetics, warm palette).
2. Beat-reactive background and visual effects while music is playing.
3. Global song discovery from app library + YouTube results.
4. Smart playback fallback: preview tracks auto-resolve to YouTube full playback.
5. Role-aware dashboard and admin access controls.
6. Playlist, history, liked songs, artist follow, and recommendation flows.

## Tech Stack
### Frontend
1. React + Vite
2. TailwindCSS
3. Zustand (player + auth state)
4. Axios
5. React Router
6. Framer Motion

### Backend
1. Node.js
2. Express.js
3. MongoDB + Mongoose
4. JWT (`jsonwebtoken`)
5. `bcryptjs`
6. Multer

## Project Structure
```text
RhythmicTunes/
  client/
    src/
      api/
      components/
      context/
      hooks/
      pages/
      store/
      utils/
  server/
    controllers/
    middleware/
    models/
    routes/
    services/
    utils/
    server.js
  docs/
  README.md
```

## Core Features
### Authentication
1. Register and login with JWT.
2. Secure password hashing with bcrypt.
3. Protected routes and identity hydration (`/api/auth/me`).

### Music Experience
1. Search from local DB and YouTube.
2. In-app player controls (play/pause/seek/volume/queue).
3. YouTube source playback via hidden player flow.
4. Fallback resolution for broken preview tracks.

### Discovery
1. Trending songs.
2. History-based recommendations.
3. Playlist-based recommendations.
4. Explore page for external search and ingestion workflows.

### Social + Library
1. Like/unlike songs.
2. Follow artists.
3. Create/manage playlists.
4. Listening history timeline.

### Admin and Management
1. Admin panel route guard.
2. Admin utilities and role-based visibility.
3. Admin account bootstrap script.

## Local Setup
## Prerequisites
1. Node.js (recommended LTS)
2. MongoDB (local or cloud)
3. npm

## Install
1. Root dependencies:
```bash
npm install
```

2. Backend dependencies:
```bash
cd server
npm install
```

3. Frontend dependencies:
```bash
cd ../client
npm install
```

## Environment Variables
Create env files from examples:

1. `server/.env`
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/rhythmictunes
JWT_SECRET=replace_with_a_strong_secret
YOUTUBE_API_KEY=replace_with_your_key
```

2. `client/.env`
```env
VITE_API_URL=http://localhost:5000
```

## Run
1. Backend:
```bash
cd server
npm start
```

2. Frontend:
```bash
cd client
npm start
```

3. Open:
- [http://localhost:5173](http://localhost:5173)

## Admin Account (One Command)
From `server/`:
```bash
npm run create-admin
```

Default admin login:
1. Email: `admin@rhythmictunes.com`
2. Password: `admin123`

## API Quick Map
### Auth
1. `POST /api/auth/register`
2. `POST /api/auth/login`
3. `GET /api/auth/me`

### Songs
1. `GET /api/songs`
2. `GET /api/songs/:id`
3. `GET /api/songs/search?q=`
4. `GET /api/songs/trending`
5. `GET /api/songs/youtube-search?q=`
6. `GET /api/songs/youtube-resolve?title=&artist=`
7. `POST /api/songs`
8. `DELETE /api/songs/:id`

### Artists
1. `GET /api/artists`
2. `GET /api/artists/:id`
3. `POST /api/artists`
4. `POST /api/artists/:id/follow`

### Playlists
1. `GET /api/playlists`
2. `POST /api/playlists`
3. `GET /api/playlists/:id`
4. `PUT /api/playlists/:id`
5. `DELETE /api/playlists/:id`
6. `POST /api/playlists/:id/songs`
7. `DELETE /api/playlists/:id/songs/:songId`

### History
1. `POST /api/history`
2. `GET /api/history`
3. `DELETE /api/history`

### Recommendations
1. `GET /api/recommendations/history`
2. `GET /api/recommendations/trending`
3. `GET /api/recommendations/playlist`

### Health
1. `GET /api/health`

## Security Notes
1. `.env` files are ignored and never committed.
2. Rotate API keys periodically.
3. Replace demo admin password in production.
4. Use a strong JWT secret and HTTPS in deployment.

## Known Dev Notes
1. If login fails, run `npm run create-admin` again to reset admin account.
2. If UI looks stale, hard refresh browser (`Ctrl + Shift + R`).
3. If search seems empty, verify `YOUTUBE_API_KEY` and backend logs.

## Contributing
1. Fork repo.
2. Create feature branch.
3. Commit with clear messages.
4. Open PR.

## License
This project is licensed under the MIT License.
