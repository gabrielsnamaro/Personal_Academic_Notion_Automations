import { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    
    if (token) {
      setIsAuthenticated(true);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <>
      {!isAuthenticated ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
