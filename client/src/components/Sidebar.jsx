import { Link, useLocation } from 'react-router-dom'
import { useAudioReactiveStore } from '../store/audioReactiveStore'
import { usePlayerStore } from '../store/playerStore'
import { useAuthStore } from '../store/authStore'

const navItems = [
  {
    label: 'Home', to: '/dashboard',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.71 2.29a1 1 0 00-1.42 0l-9 9a1 1 0 000 1.42A1 1 0 003 13h1v7a2 2 0 002 2h12a2 2 0 002-2v-7h1a1 1 0 00.71-1.71zM6 20v-9.59l6-6 6 6V20z" /></svg>,
  },
  {
    label: 'Search', to: '/search',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>,
  },
  {
    label: 'Explore', to: '/explore',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z" /></svg>
  },
  {
    label: 'Playlists', to: '/playlists', match: ['/playlists', '/playlist/'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" /></svg>,
  },
  {
    label: 'Liked', to: '/liked',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-6.72-4.35-9.33-8.08C.79 10.24 1.4 6.2 4.72 4.61c2.14-1.02 4.66-.51 6.28 1.27 1.62-1.78 4.14-2.29 6.28-1.27 3.32 1.59 3.93 5.63 2.05 8.31C18.72 16.65 12 21 12 21z" /></svg>,
  },
  {
    label: 'Activity', to: '/activity',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h4l3-8 4 14 3-6h4v2h-5.28L14.2 22l-4.18-14-1.82 5H3z" /></svg>,
  },
  {
    label: 'Artists', to: '/artists', match: ['/artists', '/artist/'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>,
  },
  {
    label: 'History', to: '/history',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 00-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0013 21a9 9 0 000-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" /></svg>,
  },
  {
    label: 'Profile', to: '/profile',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>,
  },
]

function Sidebar() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const { bass } = useAudioReactiveStore()
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const canAccessAdmin = Boolean(user?.isAdmin || user?.role === 'admin' || user?.role === 'staff')

  const sidebarGlow = isPlaying
    ? `inset -1px 0 ${20 + bass * 26}px rgba(224, 125, 53, ${0.05 + bass * 0.08})`
    : 'none'

  return (
    <aside
      className="glass hidden w-[72px] flex-shrink-0 flex-col md:flex"
      style={{ borderRight: '1px solid var(--border)', zIndex: 10, boxShadow: sidebarGlow, transition: 'box-shadow 100ms ease-out' }}
    >
      <div className="sticky top-0 flex h-full flex-col items-center gap-1 px-2 py-4">
        <Link to="/dashboard" className="mb-3" title="RhythmicTunes">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{
              background: 'var(--gradient-violet)',
              boxShadow: isPlaying ? `0 0 ${10 + bass * 12}px rgba(224,125,53,${0.35 + bass * 0.3})` : '0 0 8px rgba(224,125,53,0.25)',
              transition: 'box-shadow 100ms ease-out',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        </Link>

        <nav className="flex flex-col items-center gap-1">
          {navItems.map((item) => {
            const isActive = item.match
              ? item.match.some((p) => location.pathname.startsWith(p))
              : location.pathname === item.to

            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className="group relative grid h-11 w-11 place-items-center rounded-xl transition-all duration-200"
                style={{
                  color: isActive ? 'var(--accent-bright)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--accent-muted)' : 'transparent',
                }}
              >
                <span>{item.icon}</span>
              </Link>
            )
          })}
        </nav>

        {canAccessAdmin && (
          <Link
            to="/admin"
            title="Admin Panel"
            className="mt-2 grid h-11 w-11 place-items-center rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              color: location.pathname.startsWith('/admin') ? 'var(--accent-bright)' : 'var(--text-secondary)',
              background: location.pathname.startsWith('/admin') ? 'var(--accent-muted)' : 'transparent',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </Link>
        )}

        <div className="mt-auto flex flex-col items-center gap-2">
          <div className="h-px w-8" style={{ background: 'var(--border)' }} />
          <div className="grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold" style={{ background: 'var(--accent)', color: '#fff' }}>
            {(user?.name || 'RT').slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
