import React, { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import Dashboard from './Dashboard';
import AthleteProfile from './AthleteProfile';
import VideoUpload from './VideoUpload';
import AnalysisHistory from './AnalysisHistory';
import AdminDashboard from './AdminDashboard';
import NotificationBell from './NotificationBell';
import { ToastProvider } from './ToastContext';
import { isUserLoggedIn, logoutUser, verifyCurrentUser } from './apiService';
import './App.css';
import './ToastContext.css';

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAdmin, setShowAdmin] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);

  const updateUserState = (user) => {
    setCurrentUser(user);
    const isAdmin = user && user.role === 'admin';
    setShowAdmin(isAdmin);
    if (isAdmin) {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }
  };

  const completeLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setIsLoggedIn(false);
    setShowAdmin(false);
    setShowRegister(false);
    setShowForgotPassword(false);
    setShowResetPassword(false);
    setResetToken('');
    setActiveTab('dashboard');
    setHistoryRefreshKey(0);
    setDashboardRefreshKey(0);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (isUserLoggedIn()) {
          const user = await verifyCurrentUser();
          if (user) {
            setIsLoggedIn(true);
            updateUserState(user);
          } else {
            completeLogout();
          }
        } else {
          completeLogout();
        }
      } catch {
        completeLogout();
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = async () => {
    try {
      const user = await verifyCurrentUser();
      if (user) {
        setIsLoggedIn(true);
        updateUserState(user);
      } else {
        completeLogout();
      }
    } catch {
      completeLogout();
    }
  };

  const handleUploadSuccess = () => {
    setActiveTab('history');
    setHistoryRefreshKey((k) => k + 1);
    setDashboardRefreshKey((k) => k + 1);
  };

  const handleLogout = () => {
    completeLogout();
  };

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    if (tab === 'history') {
      setHistoryRefreshKey((k) => k + 1);
    }
  };

  if (authLoading) {
    return (
      <div className="auth-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoggedIn && currentUser) {
    const isAdmin = showAdmin;
    return (
      <ToastProvider>
        <div className="app-shell">
          <header className="app-header">
            <div className="header-inner">
              <div className="brand">
                <div className="brand-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="brand-text">
                  <h1>Sports Injury Detection</h1>
                  <p>Analyze your movement and reduce injury risk</p>
                </div>
              </div>
              <div className="header-actions">
                <NotificationBell adminMode={isAdmin} />
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            </div>
          </header>

          <nav className="main-nav">
            <div className="nav-inner">
              {isAdmin ? (
                <>
                  <button
                    className={`nav-link ${activeTab === 'admin' ? 'nav-link-active' : ''}`}
                    onClick={() => setActiveTab('admin')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    Admin Dashboard
                  </button>
                  <button
                    className={`nav-link ${activeTab === 'dashboard' ? 'nav-link-active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Dashboard
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`nav-link ${activeTab === 'dashboard' ? 'nav-link-active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Dashboard
                  </button>
                  <button
                    className={`nav-link ${activeTab === 'upload' ? 'nav-link-active' : ''}`}
                    onClick={() => setActiveTab('upload')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5 2 2H5-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload Video
                  </button>
                  <button
                    className={`nav-link ${activeTab === 'profile' ? 'nav-link-active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Athlete Profile
                  </button>
                  <button
                    className={`nav-link ${activeTab === 'history' ? 'nav-link-active' : ''}`}
                    onClick={() => setActiveTab('history')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    Analysis History
                  </button>
                </>
              )}
            </div>
          </nav>

          <main className="main-content">
            {isAdmin ? (
              activeTab === 'admin' ? (
                <AdminDashboard key={dashboardRefreshKey} />
              ) : (
                <Dashboard key={dashboardRefreshKey} onNavigate={handleNavigate} />
              )
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <Dashboard key={dashboardRefreshKey} onNavigate={handleNavigate} />
                )}
                {activeTab === 'upload' && (
                  <VideoUpload key="upload" onSuccess={handleUploadSuccess} />
                )}
                {activeTab === 'profile' && (
                  <AthleteProfile onSuccess={() => {}} />
                )}
                {activeTab === 'history' && <AnalysisHistory key={historyRefreshKey} />}
              </>
            )}
          </main>
        </div>
      </ToastProvider>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="app-auth">
        <ForgotPassword 
        onToggle={() => { setShowForgotPassword(false); setShowResetPassword(false); }}
        onResetPassword={(token) => { setResetToken(token); setShowResetPassword(true); }}
      />
      </div>
    );
  }

  if (showResetPassword) {
    return (
      <div className="app-auth">
        <ResetPassword token={resetToken} onToggle={() => { setShowResetPassword(false); setShowForgotPassword(true); }} />
      </div>
    );
  }

  return (
    <div className="app-auth">
      {showRegister ? (
        <Register onSuccess={handleLoginSuccess} onToggle={() => setShowRegister(false)} />
      ) : (
        <Login 
          onSuccess={handleLoginSuccess} 
          onToggle={() => setShowRegister(true)}
          onForgotPassword={() => setShowForgotPassword(true)}
          onResetPassword={(token) => { setResetToken(token); setShowResetPassword(true); }}
        />
      )}
    </div>
  );
}

export default App;
