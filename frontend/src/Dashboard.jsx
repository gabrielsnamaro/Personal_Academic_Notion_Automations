import axios from 'axios';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import RevisionForm from './components/RevisionForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function Dashboard({ onLogout }) {
  const [currentTab, setCurrentTab] = useState('revisions');

  const handleSync = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`${API_URL}/notion/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Conexão com a API do backend Notion bem-sucedida! Status: Ativo`);
    } catch (error) {
      console.error(error);
      alert("Erro de autorização ou falha no backend.");
      if (error.response?.status === 401) {
          onLogout();
      }
    }
  };

  return (
    <div className="flex h-screen bg-white text-notion-text">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header onSync={handleSync} />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-12 py-16">
            
            {currentTab === 'dashboard' && (
              <>
                <div className="mb-12">
                  <h1 className="text-4xl font-bold mb-3 tracking-tight">Painel de Automações</h1>
                  <p className="text-[15px] text-notion-muted font-medium">
                    Gerencie suas integrações e rotinas de estudo diretamente no Notion.
                  </p>
                </div>

                <div className="bg-white border border-notion-border rounded-lg shadow-sm p-6 max-w-2xl">
                  <h2 className="text-lg font-bold text-notion-text mb-2">Status do Sistema</h2>
                  <p className="text-sm text-notion-muted mb-4">
                    Bem-vindo! No momento, as automações estão focadas no planejamento e organização da sua "Curva de Esquecimento".
                  </p>
                  
                  <div className="flex items-center justify-between border-t border-notion-border pt-4 mt-2">
                    <span className="text-sm font-medium text-notion-text">Módulo Ativo</span>
                    <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-md">
                      Revisões Espaçadas
                    </span>
                  </div>
                </div>
              </>
            )}

            {currentTab === 'revisions' && (
              <>
                <div className="mb-12">
                  <h1 className="text-4xl font-bold mb-3 tracking-tight">Revisões Espaçadas</h1>
                  <p className="text-[15px] text-notion-muted font-medium">
                    Agende tópicos de estudo para o 1º, 7º e 30º dia.
                  </p>
                </div>
                <RevisionForm />
              </>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
