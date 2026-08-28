import { useState } from 'react';
import axios from 'axios';
import { Calendar, BookOpen, Send } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function RevisionForm() {
  const [materia, setMateria] = useState('');
  const [atividade, setAtividade] = useState('');
  const [dataFormalizacao, setDataFormalizacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(`${API_URL}/notion/revisions`, {
        materia,
        atividade,
        dataFormalizacao
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Revisões (1d, 7d, 30d) agendadas e ordenadas com sucesso no Notion!' });
      setMateria('');
      setAtividade('');
      setDataFormalizacao('');
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Erro ao cadastrar revisões. Verifique o console.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-notion-border rounded-lg shadow-sm p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-notion-text mb-1">Cadastrar Revisão (Curva de Esquecimento)</h2>
      <p className="text-sm text-notion-muted mb-6">Esta automação irá injetar 3 revisões em sua página, preservando a ordem cronológica estrita da seção "# Revisões marcadas".</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-notion-text mb-1 flex items-center gap-2">
            <BookOpen size={16} className="text-notion-muted" /> Matéria
          </label>
          <input 
            type="text"
            required
            value={materia}
            onChange={e => setMateria(e.target.value)}
            placeholder="Ex: Teoria dos Grafos e Computabilidade"
            className="w-full px-3 py-2 border border-notion-border rounded-md text-sm outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-notion-text mb-1">
            Atividade / Tópico
          </label>
          <input 
            type="text"
            required
            value={atividade}
            onChange={e => setAtividade(e.target.value)}
            placeholder="Ex: Definição formal e informal de grafos"
            className="w-full px-3 py-2 border border-notion-border rounded-md text-sm outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-notion-text mb-1 flex items-center gap-2">
            <Calendar size={16} className="text-notion-muted" /> Data de Formalização (Estudo Inicial)
          </label>
          <input 
            type="date"
            required
            value={dataFormalizacao}
            onChange={e => setDataFormalizacao(e.target.value)}
            className="w-full px-3 py-2 border border-notion-border rounded-md text-sm outline-none focus:border-gray-400 transition-colors"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white text-sm font-medium px-4 py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sincronizando com o Notion...' : 'Confirmar Agendamentos'}
          {!loading && <Send size={16} />}
        </button>

        {message && (
          <div className={`p-3 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}
