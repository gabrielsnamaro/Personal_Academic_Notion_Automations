import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import axios from 'axios';
import { Calendar, BookOpen, Send, Plus, X, CalendarCheck2, Trash2 } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function ReviewForm() {
  const [batches, setBatches] = useLocalStorage('reviewForm_batches', [{ materia: '', atividades: [''] }]);
  const [dataFormalizacao, setDataFormalizacao] = useLocalStorage('reviewForm_data', '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSetToday = () => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(today - tzOffset)).toISOString().split('T')[0];
    setDataFormalizacao(localISOTime);
  };

  const addBatch = () => {
    setBatches([...batches, { materia: '', atividades: [''] }]);
  };

  const removeBatch = (index) => {
    if (batches.length === 1) {
      setBatches([{ materia: '', atividades: [''] }]); // Limpa o único se clicar na lixeira
    } else {
      const newBatches = [...batches];
      newBatches.splice(index, 1);
      setBatches(newBatches);
    }
  };

  const updateBatchMateria = (index, value) => {
    const newBatches = [...batches];
    newBatches[index].materia = value;
    setBatches(newBatches);
  };

  const updateBatchAtividade = (bIndex, aIndex, value) => {
    const newBatches = [...batches];
    newBatches[bIndex].atividades[aIndex] = value;
    setBatches(newBatches);
  };

  const addAtividadeToBatch = (bIndex) => {
    const newBatches = [...batches];
    newBatches[bIndex].atividades.push('');
    setBatches(newBatches);
  };

  const removeAtividadeFromBatch = (bIndex, aIndex) => {
    const newBatches = [...batches];
    if (newBatches[bIndex].atividades.length > 1) {
      newBatches[bIndex].atividades.splice(aIndex, 1);
      setBatches(newBatches);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const cleanedBatches = batches.map(b => ({
      materia: b.materia,
      atividades: b.atividades.filter(a => a.trim() !== '')
    })).filter(b => b.materia.trim() !== '' && b.atividades.length > 0);

    if (cleanedBatches.length === 0) {
      setMessage({ type: 'error', text: 'Adicione pelo menos uma matéria com um tópico válido.' });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      await axios.post(`${API_URL}/notion/reviews`, {
        batches: cleanedBatches,
        dataFormalizacao
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage({ type: 'success', text: `Revisões em lote agendadas com sucesso no Notion!` });
      setBatches([{ materia: '', atividades: [''] }]);
      // Opcional: setDataFormalizacao(''); se quiser limpar a data
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
          Esta automação irá injetar 3 revisões (1d, 7d, 30d) para cada bloco listado abaixo, preservando a ordem cronológica estrita da seção "# Revisões marcadas".
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2 mb-6">
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

          <div className="space-y-6">
            {batches.map((batch, bIndex) => (
              <div key={bIndex} className="p-4 border border-notion-border rounded-lg bg-gray-50/50 relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBatch(bIndex)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-red-50"
                  title="Limpar / Remover Bloco"
                >
                  <Trash2 size={16} />
                </Button>

                <div className="space-y-2 mt-1">
                  <Label className="flex items-center gap-2 text-notion-text font-medium">
                    <BookOpen size={16} className="text-notion-muted" /> Matéria
                  </Label>
                  <Input 
                    type="text"
                    required
                    value={batch.materia}
                    onChange={e => updateBatchMateria(bIndex, e.target.value)}
                    placeholder="Ex: Teoria dos Grafos e Computabilidade"
                    className="border-notion-border focus-visible:ring-gray-300 pr-10" // Padding para o botão lixeira
                  />
                </div>

                <div className="space-y-3 mt-4">
                  <Label className="text-notion-text font-medium block">
                    Atividades / Tópicos
                  </Label>
                  <div className="space-y-3">
                    {batch.atividades.map((atv, aIndex) => (
                      <div key={aIndex} className="flex items-center gap-2">
                        <Input 
                          type="text"
                          required
                          value={atv}
                          onChange={e => updateBatchAtividade(bIndex, aIndex, e.target.value)}
                          placeholder={`Tópico ${aIndex + 1}`}
                          className="border-notion-border focus-visible:ring-gray-300"
                        />
                        {batch.atividades.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeAtividadeFromBatch(bIndex, aIndex)}
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
                    onClick={() => addAtividadeToBatch(bIndex)}
                    className="mt-1 h-8 px-2 text-notion-muted hover:text-notion-text flex items-center gap-1"
                  >
                    <Plus size={16} /> Adicionar tópico
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-2 border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 bg-transparent"
            onClick={addBatch}
          >
            <Plus size={16} className="mr-2" /> Adicionar outra matéria
          </Button>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white transition-all duration-300 hover:shadow-lg mt-6"
          >
            {loading ? 'Sincronizando com o Notion...' : 'Confirmar Agendamentos'}
            {!loading && <Send size={16} className="ml-2" />}
          </Button>

          {message && (
            <div className={`p-3 rounded-md text-sm font-medium mt-4 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
