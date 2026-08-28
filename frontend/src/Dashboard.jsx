import axios from 'axios';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TaskBlock from './components/TaskBlock';
import RevisionForm from './components/RevisionForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const mockTasks = [
  {
    id: 1,
    title: 'Linear Algebra',
    topics: ['Matrix transformations', 'Eigenvalues and eigenvectors', 'Inner product spaces'],
    checks: ['Complete practice problems', 'Review lecture notes']
  }
];

export default function Dashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState(mockTasks);
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard' ou 'revisions'

  const handleSync = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`${API_URL}/notion/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Sincronização do painel executada com sucesso! Usuário: ${res.data.user}`);
    } catch (error) {
      console.error(error);
      alert("Erro de autorização.");
      if (error.response?.status === 401) {
          onLogout();
      }
    }
  };

  return (
    <div className="flex h-screen bg-white text-notion-text">
      <Sidebar user={user} currentTab={currentTab} setCurrentTab={setCurrentTab} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header onSync={handleSync} />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-12 py-16">
            
            {currentTab === 'dashboard' && (
              <>
                <div className="mb-12">
                  <h1 className="text-4xl font-bold mb-3 tracking-tight">Task Manager</h1>
                  <p className="text-[15px] text-notion-muted font-medium">
                    Organize lectures, assignments, and study logs directly in your minimalist central workspace.
                  </p>
                </div>
                <div className="flex flex-col">
                  {tasks.map((task) => (
                    <TaskBlock key={task.id} title={task.title} topics={task.topics} checks={task.checks} />
                  ))}
                </div>
              </>
            )}

            {currentTab === 'revisions' && (
              <>
                <div className="mb-12">
                  <h1 className="text-4xl font-bold mb-3 tracking-tight">Automação de Revisões</h1>
                  <p className="text-[15px] text-notion-muted font-medium">
                    Aplique o método Spaced Repetition. O sistema organizará os blocos cronologicamente na sua página.
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
