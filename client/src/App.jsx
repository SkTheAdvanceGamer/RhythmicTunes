import { Navigate, Route, Routes, Link } from 'react-router-dom'
import MusicPlayer from './components/MusicPlayer'
import PageTransition from './components/PageTransition'
import { ThemeProvider } from './context/ThemeContext'
import AdminPage from './pages/AdminPage'
import ActivityPage from './pages/ActivityPage'
import ArtistDetailPage from './pages/ArtistDetailPage'
import ArtistsPage from './pages/ArtistsPage'
import DashboardPage from './pages/DashboardPage'
import HistoryPage from './pages/HistoryPage'
import LikedSongsPage from './pages/LikedSongsPage'
import LoginPage from './pages/LoginPage'
import PlaylistDetailPage from './pages/PlaylistDetailPage'
import PlaylistsPage from './pages/PlaylistsPage'
import RegisterPage from './pages/RegisterPage'
import SearchPage from './pages/SearchPage'
import ExplorePage from './pages/ExplorePage'
import ProfilePage from './pages/ProfilePage'
import SongProfilePage from './pages/SongProfilePage'
import { useAuthStore } from './store/authStore'

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? children : <Navigate to="/login" replace />
}
<h1 ></h1>
function AdminRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!(user?.isAdmin || user?.role === 'admin' || user?.role === 'staff')) return <Navigate to="/dashboard" replace />
  return children
}

function HomePage() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden px-6" style={{ background: 'var(--bg-primary)' }}>
      {/* Animated mesh background */}
      <div className="mesh-bg" />

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full opacity-25 blur-[100px]" style={{ background: 'var(--accent)' }} />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full opacity-15 blur-[100px]" style={{ background: '#6366f1' }} />
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full opacity-10 blur-[80px]" style={{ background: '#a78bfa' }} />
      </div>

      <section className="animate-slide-up relative z-10 mx-auto max-w-3xl text-center">
        <div className="glass-card mb-8 inline-flex items-center gap-3 rounded-full px-5 py-2">
          <div className="grid h-7 w-7 place-items-center rounded-full" style={{ background: 'var(--gradient-violet)', boxShadow: '0 0 16px rgba(207,159,255,0.4)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0d0b1a">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>RhythmicTunes</span>
        </div>

        <h1 className="text-5xl font-black leading-tight sm:text-7xl" style={{ color: 'var(--text-primary)' }}>
          Music for{' '}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--gradient-aurora)' }}>
            every moment
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-8" style={{ color: 'var(--text-secondary)' }}>
          Discover songs, follow artists, create playlists, and let your listening
          history shape smarter recommendations — all in one place.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/register"
            className="rounded-full px-8 py-3.5 text-base font-extrabold transition-all duration-300 hover:scale-105"
            style={{ background: 'var(--gradient-violet)', color: '#0d0b1a', boxShadow: '0 0 24px rgba(207,159,255,0.3)' }}
          >
            Get Started Free
          </Link>
          <Link to="/login"
            className="glass-card rounded-full px-8 py-3.5 text-base font-bold transition-all duration-300 hover:scale-105"
            style={{ color: 'var(--text-primary)' }}
          >
            Log In
          </Link>
        </div>

        <div className="pointer-events-none mt-16 flex items-center justify-center gap-6 opacity-25">
          {['♫', '♪', '♬', '♩', '♫'].map((note, i) => (
            <span key={i} className="text-2xl" style={{ color: 'var(--accent)', animation: `float 3s ease-in-out infinite`, animationDelay: `${i * 0.4}s` }}>
              {note}
            </span>
          ))}
        </div>
      </section>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="relative flex min-h-svh items-center justify-center px-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="mesh-bg" />
      <div className="animate-fade-in relative z-10 text-center">
        <p className="text-8xl font-black" style={{ color: 'var(--accent)' }}>404</p>
        <p className="mt-4 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Page not found</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>This track doesn't exist in our library.</p>
        <Link to="/" className="mt-6 inline-block rounded-full px-6 py-3 text-sm font-bold transition-all hover:scale-105"
          style={{ background: 'var(--gradient-violet)', color: '#0d0b1a' }}
        >
          Go home
        </Link>
      </div>
    </main>
  )
}

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
        <Route path="/activity" element={<ProtectedRoute><PageTransition><ActivityPage /></PageTransition></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><PageTransition><ExplorePage /></PageTransition></ProtectedRoute>} />
        <Route path="/liked" element={<ProtectedRoute><PageTransition><LikedSongsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><PageTransition><SearchPage /></PageTransition></ProtectedRoute>} />
        <Route path="/playlists" element={<ProtectedRoute><PageTransition><PlaylistsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/playlist/:id" element={<ProtectedRoute><PageTransition><PlaylistDetailPage /></PageTransition></ProtectedRoute>} />
        <Route path="/artists" element={<ProtectedRoute><PageTransition><ArtistsPage /></PageTransition></ProtectedRoute>} />
        <Route path="/artist/:id" element={<ProtectedRoute><PageTransition><ArtistDetailPage /></PageTransition></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><PageTransition><HistoryPage /></PageTransition></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><PageTransition><ProfilePage /></PageTransition></ProtectedRoute>} />
        <Route path="/song/:id" element={<ProtectedRoute><PageTransition><SongProfilePage /></PageTransition></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><PageTransition><AdminPage /></PageTransition></AdminRoute>} />
        <Route path="*" element={<PageTransition><NotFoundPage /></PageTransition>} />
      </Routes>
      {isAuthenticated && <MusicPlayer />}
    </ThemeProvider>
  )
}

export default App
