import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import axios from 'axios';
import { Calendar as CalendarIcon, BookOpen, Send, Plus, X, CalendarCheck2, Trash2 } from 'lucide-react';
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
      setBatches([{ materia: '', atividades: [''] }]);
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

  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setProgress(0);
    setProgressMessage('Iniciando conexão...');
    setMessage(null);

    if (!dataFormalizacao) {
      setMessage({ type: 'error', text: 'Selecione a data de formalização inicial.' });
      setLoading(false);
      return;
    }

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
      
      const response = await fetch(`${API_URL}/notion/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          batches: cleanedBatches,
          dataFormalizacao
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // Guarda pedaços incompletos no buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6); // Remove 'data: '
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.done) {
                setMessage({ type: 'success', text: 'Revisões em lote agendadas com sucesso no Notion!' });
                setBatches([{ materia: '', atividades: [''] }]);
                break; // Finalizou com sucesso
              }
              if (data.progress !== undefined) {
                setProgress(data.progress);
                if (data.message) setProgressMessage(data.message);
              }
            } catch (e) {
              if (e.message !== "Unexpected end of JSON input") {
                 throw e;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: `Erro: ${err.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => {
         setProgress(0);
         setProgressMessage('');
      }, 2000); // Mantém o 100% por um tempinho antes de limpar
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
              <CalendarIcon size={16} className="text-notion-muted" /> Data de Formalização (Estudo Inicial)
            </Label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <Popover>
                <PopoverTrigger 
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-start text-left font-normal border-notion-border bg-white text-notion-text h-9 hover:bg-gray-50",
                    !dataFormalizacao && "text-muted-foreground"
                  )}
                >
                  {dataFormalizacao ? format(parseISO(dataFormalizacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione a data</span>}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataFormalizacao ? parseISO(dataFormalizacao) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const tzOffset = date.getTimezoneOffset() * 60000; 
                        const localISOTime = (new Date(date - tzOffset)).toISOString().split('T')[0];
                        setDataFormalizacao(localISOTime);
                      }
                    }}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>

              <Button 
                type="button" 
                variant="secondary"
                onClick={handleSetToday}
                className="flex items-center gap-2 w-full sm:w-auto h-9"
              >
                <CalendarCheck2 size={16} /> Hoje
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {batches.map((batch, bIndex) => (
              <div key={bIndex} className="p-4 border border-notion-border rounded-lg bg-gray-50/50 relative group/batch">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeBatch(bIndex)}
                  className="absolute top-2 right-2 text-gray-400 opacity-0 transition-opacity group-hover/batch:opacity-100 hover:text-red-500 hover:bg-red-50"
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
                    className="border-notion-border focus-visible:ring-gray-300 pr-10 bg-white" 
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
                          className="border-notion-border focus-visible:ring-gray-300 bg-white"
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
            className="w-full border-dashed border-2 border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 bg-transparent h-10 mt-2"
            onClick={addBatch}
          >
            <Plus size={16} className="mr-2" /> Adicionar outra matéria
          </Button>

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white transition-all duration-300 hover:shadow-lg mt-6 h-11 relative overflow-hidden"
          >
            <div 
              className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
            <span className="relative flex items-center justify-center">
              {loading ? (progressMessage || 'Sincronizando com o Notion...') : 'Confirmar Agendamentos'}
              {!loading && <Send size={16} className="ml-2" />}
            </span>
          </Button>

          {loading && progress > 0 && (
            <div className="mt-2 flex flex-col gap-1 px-1">
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-[#2f2f2f] h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-xs text-right text-gray-500 font-medium">{progress}%</p>
            </div>
          )}

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
