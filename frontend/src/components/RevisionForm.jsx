import { useState } from 'react';
import axios from 'axios';
import { Calendar, BookOpen, Send, Plus, X, CalendarCheck2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function RevisionForm() {
  const [materia, setMateria] = useState('');
  const [atividades, setAtividades] = useState(['']); // Array de tópicos
  const [dataFormalizacao, setDataFormalizacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSetToday = () => {
    // Pega a data atual no formato YYYY-MM-DD local
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(today - tzOffset)).toISOString().split('T')[0];
    setDataFormalizacao(localISOTime);
  };

  const updateAtividade = (index, value) => {
    const newAtividades = [...atividades];
    newAtividades[index] = value;
    setAtividades(newAtividades);
  };

  const addAtividade = () => {
    setAtividades([...atividades, '']);
  };

  const removeAtividade = (index) => {
    if (atividades.length > 1) {
      const newAtividades = atividades.filter((_, i) => i !== index);
      setAtividades(newAtividades);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Filtra tópicos vazios
    const atividadesFiltradas = atividades.filter(a => a.trim() !== '');
    if (atividadesFiltradas.length === 0) {
      setMessage({ type: 'error', text: 'Adicione pelo menos um tópico válido.' });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(`${API_URL}/notion/revisions`, {
        materia,
        atividades: atividadesFiltradas,
        dataFormalizacao
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: 'Revisões (1d, 7d, 30d) agendadas e ordenadas com sucesso no Notion!' });
      setMateria('');
      setAtividades(['']);
      setDataFormalizacao('');
    } catch (err) {
      console.error(err);
      const errorDetail = err.response?.data?.error || err.message;
      setMessage({ type: 'error', text: `Erro: ${errorDetail}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-notion-border rounded-lg shadow-sm p-6 max-w-2xl mb-12">
      <h2 className="text-xl font-bold text-notion-text mb-1">Cadastrar Revisão (Curva de Esquecimento)</h2>
      <p className="text-sm text-notion-muted mb-6">Esta automação irá injetar 3 revisões em sua página, preservando a ordem cronológica estrita da seção "# Revisões marcadas".</p>
      
      <form onSubmit={handleSubmit} className="space-y-5">
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
          <label className="block text-sm font-medium text-notion-text mb-2">
            Atividades / Tópicos
          </label>
          <div className="space-y-2">
            {atividades.map((atv, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input 
                  type="text"
                  required
                  value={atv}
                  onChange={e => updateAtividade(idx, e.target.value)}
                  placeholder={`Tópico ${idx + 1}`}
                  className="flex-1 px-3 py-2 border border-notion-border rounded-md text-sm outline-none focus:border-gray-400 transition-colors"
                />
                {atividades.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeAtividade(idx)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button 
            type="button" 
            onClick={addAtividade}
            className="mt-2 flex items-center gap-1 text-sm font-medium text-notion-muted hover:text-notion-text transition-colors"
          >
            <Plus size={16} /> Adicionar tópico
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-notion-text mb-1 flex items-center gap-2">
            <Calendar size={16} className="text-notion-muted" /> Data de Formalização (Estudo Inicial)
          </label>
          <div className="flex gap-2">
            <input 
              type="date"
              required
              value={dataFormalizacao}
              onChange={e => setDataFormalizacao(e.target.value)}
              className="flex-1 px-3 py-2 border border-notion-border rounded-md text-sm outline-none focus:border-gray-400 transition-colors"
            />
            <button 
              type="button" 
              onClick={handleSetToday}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-notion-text px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <CalendarCheck2 size={16} />
              Hoje
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-6 flex items-center justify-center gap-2 bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white text-sm font-medium px-4 py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
