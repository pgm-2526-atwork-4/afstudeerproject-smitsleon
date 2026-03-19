import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Reports' },
  { to: '/events', label: 'Events' },
  { to: '/artists', label: 'Artiesten' },
  { to: '/venues', label: 'Venues' },
];

export default function AdminLayout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex bg-cb-bg">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-cb-surface border-r border-cb-border flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-cb-border">
          <h1 className="text-lg font-bold text-cb-text flex items-center gap-2">
            <img src="/logo-green.svg" alt="Logo" className="h-6 w-6" />
            Concert Buddy
          </h1>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-cb-primary/15 text-cb-primary'
                    : 'text-cb-text-secondary hover:bg-cb-surface-light hover:text-cb-text'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="px-4 py-4 border-t border-cb-border">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-cb-text truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-cb-text-muted">Admin</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-3 w-full text-left text-xs text-cb-text-muted hover:text-cb-error transition-colors cursor-pointer"
          >
            Uitloggen
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
