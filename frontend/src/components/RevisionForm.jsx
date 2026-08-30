import { useState } from 'react';
import axios from 'axios';
import { Calendar, BookOpen, Send, Plus, X, CalendarCheck2 } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function RevisionForm() {
  const [materia, setMateria] = useState('');
  const [atividades, setAtividades] = useState(['']); // Array de topicos
  const [dataFormalizacao, setDataFormalizacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSetToday = () => {
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
    <Card className="max-w-2xl mb-12 shadow-sm border-notion-border rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-notion-text">Cadastrar Revisão (Curva de Esquecimento)</CardTitle>
        <CardDescription className="text-sm text-notion-muted">
          Esta automação irá injetar 3 revisões em sua página, preservando a ordem cronológica estrita da seção "# Revisões marcadas".
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-notion-text font-medium">
              <BookOpen size={16} className="text-notion-muted" /> Matéria
            </Label>
            <Input 
              type="text"
              required
              value={materia}
              onChange={e => setMateria(e.target.value)}
              placeholder="Ex: Teoria dos Grafos e Computabilidade"
              className="border-notion-border focus-visible:ring-gray-300"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-notion-text font-medium block">
              Atividades / Tópicos
            </Label>
            <div className="space-y-3">
              {atividades.map((atv, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input 
                    type="text"
                    required
                    value={atv}
                    onChange={e => updateAtividade(idx, e.target.value)}
                    placeholder={`Tópico ${idx + 1}`}
                    className="border-notion-border focus-visible:ring-gray-300"
                  />
                  {atividades.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeAtividade(idx)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                    >
                      <X size={18} />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button 
              type="button" 
              variant="ghost"
              size="sm"
              onClick={addAtividade}
              className="mt-1 h-8 px-2 text-notion-muted hover:text-notion-text flex items-center gap-1"
            >
              <Plus size={16} /> Adicionar tópico
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-notion-text font-medium">
              <Calendar size={16} className="text-notion-muted" /> Data de Formalização (Estudo Inicial)
            </Label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <Input 
                type="date"
                required
                value={dataFormalizacao}
                onChange={e => setDataFormalizacao(e.target.value)}
                className="border-notion-border focus-visible:ring-gray-300 w-full"
              />
              <Button 
                type="button" 
                variant="secondary"
                onClick={handleSetToday}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <CalendarCheck2 size={16} /> Hoje
              </Button>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white transition-all duration-300 hover:shadow-lg"
          >
            {loading ? 'Sincronizando com o Notion...' : 'Confirmar Agendamentos'}
            {!loading && <Send size={16} className="ml-2" />}
          </Button>

          {message && (
            <div className={`p-3 rounded-md text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
