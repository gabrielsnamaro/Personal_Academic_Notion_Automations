import axios from 'axios';
import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function Dashboard({ onLogout }) {
  const [status, setStatus] = useState('');

  const testApi = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`${API_URL}/notion/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data.message);
    } catch (error) {
      console.error(error);
      setStatus("Erro de autorização.");
      if (error.response?.status === 401) {
          onLogout();
      }
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Painel de Automações</h1>
      <p>Bem-vindo ao gerenciador dinâmico do Notion.</p>
      
      <button onClick={testApi} style={{ margin: '20px', padding: '10px' }}>
        Testar Conexão com API Protegida
      </button>

      {status && <p><strong>Status:</strong> {status}</p>}

      <br />
      <button onClick={onLogout} style={{ marginTop: '50px', backgroundColor: '#d9534f', color: 'white' }}>
        Sair
      </button>
    </div>
  );
}

export default Dashboard;
