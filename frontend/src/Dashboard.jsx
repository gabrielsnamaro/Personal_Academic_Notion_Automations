import axios from 'axios';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TaskBlock from './components/TaskBlock';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Mock data based on the wireframe until backend parsing is fully connected to an endpoint
const mockTasks = [
  {
    id: 1,
    title: 'Linear Algebra',
    topics: ['Matrix transformations', 'Eigenvalues and eigenvectors', 'Inner product spaces'],
    checks: ['Complete practice problems', 'Review lecture notes']
  },
  {
    id: 2,
    title: 'Data Structures',
    topics: ['Red-Black Tree insertion complexity', 'Graph traversal algorithms (BFS/DFS)', 'Memory footprints of hash tables'],
    checks: ['Implement practice assignment', 'Review study guide answers']
  },
  {
    id: 3,
    title: 'Organic Chemistry',
    topics: ['Nucleophilic substitution mechanisms (Sn1 vs Sn2)', 'Stereochemistry and chirality configurations', 'Spectroscopic identification tables'],
    checks: ['Complete pre-lab report', 'Check reaction pathway flowcharts']
  },
  {
    id: 4,
    title: 'Database Systems',
    topics: ['Relational algebra transformations', 'Normalization limits up to BCNF', 'Concurrency control locks'],
    checks: ['Submit SQL queries worksheet', 'Read recommended textbook chapter']
  }
];

export default function Dashboard({ user, onLogout }) {
  const [tasks, setTasks] = useState(mockTasks);

  const handleSync = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.get(`${API_URL}/notion/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Sincronização iniciada com sucesso! Bem-vindo, ${res.data.user}`);
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
      <Sidebar user={user} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header onSync={handleSync} />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-12 py-16">
            
            {/* Title Section */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold mb-3 tracking-tight">Task Manager</h1>
              <p className="text-[15px] text-notion-muted font-medium">
                Organize lectures, assignments, and study logs directly in your minimalist central workspace.
              </p>
            </div>

            {/* Task List */}
            <div className="flex flex-col">
              {tasks.map((task) => (
                <TaskBlock 
                  key={task.id}
                  title={task.title}
                  topics={task.topics}
                  checks={task.checks}
                />
              ))}
            </div>
            
          </div>
        </div>
      </main>
    </div>
  );
}
