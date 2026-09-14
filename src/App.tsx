import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Settings as SettingsIcon,
  Bell,
  Droplet,
} from 'lucide-react';
import { DustZeroProvider, useDustZero } from './contexts/DustZeroContext';
import { formatDistanceToNow } from 'date-fns';

import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import CleaningControl from './pages/CleaningControl';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

import './App.css';

// ─── Theme initializer ────────────────────────────────────────────────────────
// Reads the persisted theme preference and applies it on first render.
function ThemeInitializer() {
  useEffect(() => {
    const saved = localStorage.getItem('dustzero-theme') || 'system';
    if (saved === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);
  return null;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
const Navigation = () => {
  const { alerts, device, isOnline, deviceId } = useDustZero();
  const unreadCount = alerts.filter((a) => !a.read).length;

  const lastUpdate = device?.updated_at
    ? formatDistanceToNow(new Date(device.updated_at), { addSuffix: true })
    : null;

  return (
    <>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <div className="mobile-topbar-logo">
          <img src="/DustZeroIcon.png" alt="DustZero" />
          <span>DustZero</span>
        </div>
        <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot" />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Sidebar */}
      <nav className="sidebar" aria-label="Main navigation">
        {/* Header (desktop only) */}
        <div className="sidebar-header">
          <img src="/DustZeroIcon.png" alt="DustZero Logo" className="sidebar-logo-img" />
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-name">DustZero</span>
            <span className="sidebar-logo-tagline">Smart Solar Panel Cleaning</span>
          </div>
        </div>

        {/* Navigation links */}
        <div className="nav-main">
          {/* Primary nav */}
          <div className="nav-section">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              aria-label="Dashboard"
            >
              <span className="nav-item-icon"><LayoutDashboard size={18} /></span>
              <span className="nav-item-label">Dashboard</span>
            </NavLink>

            <NavLink
              to="/control"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              aria-label="Cleaning Control"
            >
              <span className="nav-item-icon"><Droplet size={18} /></span>
              <span className="nav-item-label">Cleaning Control</span>
            </NavLink>

            <NavLink
              to="/analytics"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              aria-label="Analytics"
            >
              <span className="nav-item-icon"><Activity size={18} /></span>
              <span className="nav-item-label">Analytics</span>
            </NavLink>

            <NavLink
              to="/alerts"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              aria-label={`Alerts${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <span className="nav-item-icon"><Bell size={18} /></span>
              <span className="nav-item-label">Alerts</span>
              {unreadCount > 0 && (
                <span className="badge" aria-hidden="true">{unreadCount}</span>
              )}
            </NavLink>
          </div>

          {/* Separator (desktop only) */}
          <div className="nav-separator" aria-hidden="true" />

          {/* Settings */}
          <div className="nav-section">
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              aria-label="Settings"
            >
              <span className="nav-item-icon"><SettingsIcon size={18} /></span>
              <span className="nav-item-label">Settings</span>
            </NavLink>
          </div>
        </div>

        {/* Device status footer (desktop only) */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-device">
            <div className={`sidebar-footer-dot ${isOnline ? 'online' : 'offline'}`} />
            <div className="sidebar-footer-info">
              <div className="sidebar-footer-id">{deviceId}</div>
              <div className="sidebar-footer-status">
                {isOnline
                  ? lastUpdate
                    ? `Updated ${lastUpdate.replace('about ', '')}`
                    : 'Device online'
                  : 'Device offline'}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

// ─── App Content ──────────────────────────────────────────────────────────────
const AppContent = () => {
  return (
    <div className="app-container">
      <Navigation />
      <main className="main-content" id="main-content">
        <div className="page-inner animate-fade-in">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/control" element={<CleaningControl />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
function App() {
  return (
    <DustZeroProvider>
      <ThemeInitializer />
      <Router>
        <AppContent />
      </Router>
    </DustZeroProvider>
  );
}

export default App;
