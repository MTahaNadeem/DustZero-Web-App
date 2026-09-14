
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Settings as SettingsIcon, Bell, Droplet } from 'lucide-react';
import { DustZeroProvider, useDustZero } from './contexts/DustZeroContext';

import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import CleaningControl from './pages/CleaningControl';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

import './App.css';

const Navigation = () => {
  const { alerts } = useDustZero();
  const unreadCount = alerts.filter(a => !a.read).length;

  return (
    <nav className="sidebar">
      <div className="logo-container">
        <img src="/DustZeroIcon.png" alt="DustZero Logo" className="logo-icon" />
        <h1>DustZero</h1>
      </div>
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/control" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Droplet size={20} />
          <span>Control</span>
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Activity size={20} />
          <span>Analytics</span>
        </NavLink>
        <NavLink to="/alerts" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <Bell size={20} />
          <span>Alerts</span>
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <SettingsIcon size={20} />
          <span>Settings</span>
        </NavLink>
      </div>
    </nav>
  );
};

const AppContent = () => {
  return (
    <div className="app-container">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/control" element={<CleaningControl />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <DustZeroProvider>
      <Router>
        <AppContent />
      </Router>
    </DustZeroProvider>
  );
}

export default App;
