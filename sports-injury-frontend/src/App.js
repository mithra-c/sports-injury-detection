import React, { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';
import AthleteProfile from './AthleteProfile';
import { isUserLoggedIn, logoutUser } from './apiService';
import './App.css';

function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (isUserLoggedIn()) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    logoutUser();
    setIsLoggedIn(false);
    setShowRegister(false);
  };

  if (isLoggedIn) {
    return (
      <div className="dashboard">
        <h1>Welcome! 🎉</h1>
        <p>Your Sports Injury Detection Dashboard</p>
        <AthleteProfile onSuccess={() => console.log("Profile saved!")} />
        <button onClick={handleLogout} style={{marginTop: '20px'}}>Logout</button>
      </div>
    );
  }

  return (
    <div className="App">
      {showRegister ? (
        <Register onSuccess={handleLoginSuccess} onToggle={() => setShowRegister(false)} />
      ) : (
        <Login onSuccess={handleLoginSuccess} onToggle={() => setShowRegister(true)} />
      )}
    </div>
  );
}

export default App;
