import React from 'react';
import { Navigate, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const MainLayout = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">R</div>
          <h2>Rasad</h2>
        </div>
        <nav className="sidebar-nav">
          <Link to="/" className={`nav-item ${window.location.pathname === '/' ? 'active' : ''}`}>
            <span className="icon">📊</span> Dashboard
          </Link>
          {user.role === 'owner' && (
            <>
              <Link to="/routes" className={`nav-item ${window.location.pathname === '/routes' ? 'active' : ''}`}>
                <span className="icon">🛣️</span> Routes
              </Link>
              <Link to="/drivers" className={`nav-item ${window.location.pathname === '/drivers' ? 'active' : ''}`}>
                <span className="icon">🚛</span> Drivers
              </Link>
              <Link to="/customers" className={`nav-item ${window.location.pathname === '/customers' ? 'active' : ''}`}>
                <span className="icon">👥</span> Customers
              </Link>
            </>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">{user.username?.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <span className="name">{user.username}</span>
              <span className="role">{user.role || 'User'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </aside>
      <main className="main-content">
        <header className="top-bar">
          <div className="breadcrumb">Home / Dashboard</div>
          <div className="actions">
            <button className="icon-btn">🔔</button>
            <div className="search-bar">
              <input type="text" placeholder="Search anything..." />
            </div>
          </div>
        </header>
        <section className="page-body">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default MainLayout;
