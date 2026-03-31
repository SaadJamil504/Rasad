import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { deliveryAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import './Layout.css';

const MainLayout = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [prices, setPrices] = useState({ cow_price: 0, buffalo_price: 0 });
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    if (user) {
      setPrices({ cow_price: user.cow_price || 0, buffalo_price: user.buffalo_price || 0 });
    }
  }, [user]);

  const handleUpdatePrices = async (e) => {
    e.preventDefault();
    
    const roundedPrices = {
      cow_price: Math.round(parseFloat(prices.cow_price)),
      buffalo_price: Math.round(parseFloat(prices.buffalo_price))
    };

    // Validate prices are positive
    if (roundedPrices.cow_price <= 0 || roundedPrices.buffalo_price <= 0) {
      alert('Prices must be greater than 0.');
      return;
    }
    
    setUpdatingPrices(true);
    try {
      await deliveryAPI.updatePrices(roundedPrices);
      alert('Milk prices updated successfully!');
      setShowPriceModal(false);
    } catch (err) {
      console.error('Failed to update prices:', err);
      alert('Error updating prices.');
    } finally {
      setUpdatingPrices(false);
    }
  };

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/login');
    }
  };

  const showSidebar = user.role === 'owner';
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={`app-layout ${!showSidebar ? 'no-sidebar' : ''} ${user.role === 'owner' ? 'role-owner' : ''}`}>
      {showSidebar && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      {showSidebar && (
        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="logo-container">
              <div className="logo-icon">
                <img src="/logo-rasad.png" alt="Rasad" style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800 }}>R</div>
              </div>
              <div className="logo-text">
                <h2>Rasad</h2>
                <span className="logo-subtext">{t('SUPPLIES MANAGER', 'سپلائیز منیجر')}</span>
              </div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-group-label">{t('MAIN', 'مین')}</div>
            <Link to="/" className={`nav-item ${window.location.pathname === '/' ? 'active' : ''}`} onClick={closeSidebar}>
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </span>
              {t('Dashboard', 'ڈیش بورڈ')}
            </Link>
            
            <div className="nav-group-label">{t('CUSTOMERS', 'گاہک')}</div>
            <Link to="/customers" className={`nav-item ${window.location.pathname === '/customers' ? 'active' : ''}`} onClick={closeSidebar}>
              <span className="nav-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </span>
              {t('All Customers', 'گاہکوں کی فہرست')}
            </Link>
            
            {user.role === 'owner' && (
              <>
                <Link to="/bills" className={`nav-item ${window.location.pathname === '/bills' ? 'active' : ''}`} onClick={closeSidebar}>
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </span>
                  {t('Monthly Bill', 'ماہانہ بل')}
                </Link>
                
                <div className="nav-group-label">{t('FINANCE', 'مالیات')}</div>
                <Link to="/payments" className={`nav-item ${window.location.pathname === '/payments' ? 'active' : ''}`} onClick={closeSidebar}>
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  </span>
                  {t('Payments', 'ادائیگیاں')}
                  {/* Mock badge if needed */}
                </Link>

                <div className="nav-group-label">{t('OPERATIONS', 'آپریشنز')}</div>
                <Link to="/routes" className={`nav-item ${window.location.pathname === '/routes' ? 'active' : ''}`} onClick={closeSidebar}>
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 7m0 10V7" /></svg>
                  </span>
                  {t('Routes', 'روٹس')}
                </Link>
                <Link to="/drivers" className={`nav-item ${window.location.pathname === '/drivers' ? 'active' : ''}`} onClick={closeSidebar}>
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </span>
                  {t('Drivers', 'ڈرائیورز')}
                </Link>
                <Link to="/reports" className={`nav-item ${window.location.pathname === '/reports' ? 'active' : ''}`} onClick={closeSidebar}>
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  </span>
                  {t('Reports', 'رپورٹس')}
                </Link>
                <Link to="/drivers-report" className={`nav-item ${window.location.pathname === '/drivers-report' ? 'active' : ''}`} onClick={closeSidebar}>
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </span>
                  {t('Drivers Report', 'ڈرائیورز رپورٹ')}
                </Link>
                <div className="nav-item price-adjust-item" onClick={() => { setShowPriceModal(true); closeSidebar(); }}>
                  <span className="nav-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  {t('Adjust Price', 'نرخ بدلیں')}
                </div>
              </>
            )}
            {user.role === 'driver' && (
              <Link to="/drivers" className={`nav-item ${window.location.pathname === '/drivers' ? 'active' : ''}`} onClick={closeSidebar}>
                <span className="nav-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </span>
                {t('My Profile', 'میری پروفائل')}
              </Link>
            )}
          </nav>
          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="avatar">{user.username?.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <span className="name">{user.username}</span>
                <span className="role">{t(user.role || 'User', user.role === 'owner' ? 'مالک' : (user.role === 'driver' ? 'ڈرائیور' : 'گاہک'))}</span>
              </div>
            </div>
          </div>
        </aside>
      )}
      <main className="main-content">
        {user.role === 'owner' && (
          <header className={showSidebar ? "owner-header-compact" : "customer-driver-header-transparent"}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {showSidebar && (
                  <button className="hamburger-btn owner-hamburger" onClick={toggleSidebar} style={{ color: '#1e293b', fontSize: '2.2rem', fontWeight: 'bold', minWidth: '44px', minHeight: '44px', alignItems: 'center', justifyContent: 'center' }}>
                    ☰
                  </button>
                )}
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: showSidebar ? '#1e293b' : 'white' }}>
                  {showSidebar ? t('Dashboard', 'ڈیش بورڈ') : ''}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button 
                  onClick={toggleLanguage} 
                  className="lang-toggle-btn"
                  style={{ 
                    padding: '0.5rem 1rem', 
                    borderRadius: '2rem', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    background: 'rgba(255,255,255,0.1)', 
                    color: showSidebar ? '#1e293b' : 'white',
                    fontWeight: 700, 
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    backdropFilter: 'blur(5px)'
                  }}
                >
                  {language === 'en' ? 'اردو' : 'English'}
                </button>
                <button 
                  onClick={handleLogout} 
                  className="logout-banner-btn-compact"
                  style={!showSidebar ? { background: 'rgba(239, 68, 68, 0.2)', color: '#fee2e2', borderColor: 'rgba(239, 68, 68, 0.3)' } : {}}
                >
                  {t('Logout', 'لاگ آؤٹ')}
                </button>
              </div>
            </div>
          </header>
        )}
        <section className={`page-body ${!showSidebar ? 'full-width' : ''}`}>
          <Outlet />
        </section>
      </main>

      {showPriceModal && (
        <div className="modal-overlay-layout" onClick={(e) => { if (e.target === e.currentTarget) setShowPriceModal(false); }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1.5rem', width: '90%', maxWidth: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', position: 'relative' }}>
            <button 
              onClick={() => setShowPriceModal(false)}
              style={{
                position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0',
                width: '32px', height: '32px', borderRadius: '50%', color: '#64748b', fontSize: '1.25rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
              }}
            >
              &times;
            </button>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1e293b' }}>{t('Adjust Daily Milk Prices', 'دودھ کے روزانہ نرخ بدلیں')}</h3>
            <form onSubmit={handleUpdatePrices}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>{t('Cow Milk Price (per Liter)', 'گائے کے دودھ کا ریٹ (فی لیٹر)')}</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={prices.cow_price}
                  onChange={(e) => setPrices({ ...prices, cow_price: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', boxSizing: 'border-box', color: '#1e293b' }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.9rem' }}>{t('Buffalo Milk Price (per Liter)', 'بھینس کے دودھ کا ریٹ (فی لیٹر)')}</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={prices.buffalo_price}
                  onChange={(e) => setPrices({ ...prices, buffalo_price: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', boxSizing: 'border-box', color: '#1e293b' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', width: '100%', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowPriceModal(false)}
                  style={{
                    flex: '1 1 0',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#64748b',
                    fontWeight: '800',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    margin: 0,
                    padding: 0,
                    width: '0',
                    boxSizing: 'border-box'
                  }}
                >
                  {t('Cancel', 'کینسل')}
                </button>
                <button
                  type="submit"
                  disabled={updatingPrices}
                  style={{
                    flex: '1 1 0',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#27ae60',
                    color: 'white',
                    fontWeight: '800',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    margin: 0,
                    padding: 0,
                    width: '0',
                    boxSizing: 'border-box',
                    boxShadow: '0 4px 12px rgba(39, 174, 96, 0.2)'
                  }}
                >
                  {updatingPrices ? t('Saving...', 'محفوظ ہو رہا ہے...') : t('Save Prices', 'ریٹ محفوظ کریں')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
