import { useState, useEffect } from 'react';
import { verifySession } from '@/api/auth.api';
import Login from './Login';
import Dashboard from './Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setIsChecking(false);
        return;
      }

      try {
        await verifySession();
        setIsAuthenticated(true);
      } catch (error) {
        console.warn("Falha ao verificar sessão:", error);
        // Só desloga se o token for invalidado pelo backend (401/403)
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          console.warn("Token inválido ou expirado, deslogando usuário.");
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        } else {
          // Se for erro de rede ou 404 (backend desatualizado), mantém a sessão otimisticamente
          setIsAuthenticated(true);
        }
      } finally {
        setIsChecking(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setIsAuthenticated(false);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#1a1a1a]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <>
      {!isAuthenticated ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
