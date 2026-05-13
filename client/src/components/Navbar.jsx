import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

function Navbar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')

  const initials = user?.name
    ? user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : 'RT'

  const handleSearch = (e) => {
    e.preventDefault()
    const q = searchTerm.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header
      className="sticky top-0 z-20 px-4 py-2 md:px-6"
      style={{
        background: 'rgba(9, 8, 6, 0.84)',
        backdropFilter: 'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 md:flex">
          <button type="button" onClick={() => navigate(-1)} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>
          </button>
          <button type="button" onClick={() => navigate(1)} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative max-w-lg">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="var(--text-muted)">
              <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="What do you want to play?"
              className="w-full rounded-full py-2.5 pl-10 pr-4 text-sm outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          {user?.isAdmin || user?.role === 'admin' || user?.role === 'staff' ? (
            <Link to="/admin" className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Admin Panel
            </Link>
          ) : null}
          <span className="hidden text-sm font-semibold md:block" style={{ color: 'var(--text-primary)' }}>{user?.name}</span>
          <div className="grid h-9 w-9 place-items-center rounded-full text-xs font-extrabold" style={{ background: 'var(--accent)', color: '#fff' }}>
            {initials}
          </div>
          <button type="button" onClick={handleLogout} className="rounded-full px-4 py-2 text-xs font-bold" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar
