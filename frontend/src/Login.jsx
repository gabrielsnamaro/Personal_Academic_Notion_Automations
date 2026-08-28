import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function Login({ onLoginSuccess }) {
  const handleSuccess = async (credentialResponse) => {
    try {
      // Envia o token do Google para o backend
      const res = await axios.post(`${API_URL}/auth/google`, {
        credential: credentialResponse.credential,
      });

      // Salva o token local do backend
      localStorage.setItem('auth_token', res.data.token);
      onLoginSuccess(res.data.user);
    } catch (error) {
      console.error("Falha no login", error);
      alert(error.response?.data?.error || "Acesso Negado.");
    }
  };

  const handleError = () => {
    console.error("Login Failed");
    alert("Falha na autenticação com o Google.");
  };

  return (
    <div className="login-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>Notion Dynamic Manager</h1>
      <p>Acesso restrito. Faça login para continuar.</p>
      
      <div style={{ marginTop: '20px' }}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap
        />
      </div>
    </div>
  );
}

export default Login;
