import { useState, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Calendar as CalendarIcon, BookOpen, Send, Plus, X, CalendarCheck2, Trash2 } from 'lucide-react';
import { ReviewBatchItem } from './ReviewBatchItem';
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { scheduleReviews } from '@/api/reviews.api';

// Native browser view transitions helper
const withViewTransition = (callback) => {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      flushSync(() => {
        callback();
      });
    });
  } else {
    callback();
  }
};

export default function ReviewForm() {
  const [batches, setBatches] = useLocalStorage('reviewForm_batches', [
    { id: crypto.randomUUID(), subject: '', activities: [''] }
  ]);
  const [formalizationDate, setFormalizationDate] = useLocalStorage('reviewForm_date', '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Garante que blocos antigos do localStorage ganhem um ID unico para a animacao funcionar
  useEffect(() => {
    const hasMissingIds = batches.some(b => !b.id);
    if (hasMissingIds) {
      setBatches(prev => prev.map(b => b.id ? b : { ...b, id: crypto.randomUUID() }));
    }
  }, [batches, setBatches]);

  const handleSetToday = () => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000; 
    const localISOTime = (new Date(today - tzOffset)).toISOString().split('T')[0];
    setFormalizationDate(localISOTime);
  };

  const addBatch = useCallback(() => {
    withViewTransition(() => {
      setBatches(prev => [...prev, { id: crypto.randomUUID(), subject: '', activities: [''] }]);
    });
  }, [setBatches]);

  const removeBatch = useCallback((bIndex) => {
    withViewTransition(() => {
      setBatches(prev => prev.filter((_, i) => i !== bIndex));
    });
  }, [setBatches]);

  const duplicateBatch = useCallback((bIndex) => {
    withViewTransition(() => {
      setBatches(prev => {
        const newBatches = [...prev];
        const clone = JSON.parse(JSON.stringify(newBatches[bIndex]));
        clone.id = crypto.randomUUID(); // Must have a fresh unique ID
        newBatches.splice(bIndex + 1, 0, clone);
        return newBatches;
      });
    });
  }, [setBatches]);

  const moveBatchUp = useCallback((bIndex) => {
    if (bIndex === 0) return;
    withViewTransition(() => {
      setBatches(prev => {
        const newBatches = [...prev];
        [newBatches[bIndex - 1], newBatches[bIndex]] = [newBatches[bIndex], newBatches[bIndex - 1]];
        return newBatches;
      });
    });
  }, [setBatches]);

  const moveBatchDown = useCallback((bIndex) => {
    withViewTransition(() => {
      setBatches(prev => {
        if (bIndex === prev.length - 1) return prev;
        const newBatches = [...prev];
        [newBatches[bIndex + 1], newBatches[bIndex]] = [newBatches[bIndex], newBatches[bIndex + 1]];
        return newBatches;
      });
    });
  }, [setBatches]);

  const updateBatchSubject = useCallback((bIndex, value) => {
    setBatches(prev => {
      const newBatches = [...prev];
      newBatches[bIndex].subject = value;
      return newBatches;
    });
  }, [setBatches]);

  const updateBatchActivity = useCallback((bIndex, aIndex, value) => {
    setBatches(prev => {
      const newBatches = [...prev];
      newBatches[bIndex].activities[aIndex] = value;
      return newBatches;
    });
  }, [setBatches]);

  const addActivityToBatch = useCallback((bIndex) => {
    setBatches(prev => {
      const newBatches = [...prev];
      newBatches[bIndex].activities.push('');
      return newBatches;
    });
  }, [setBatches]);

  const removeActivityFromBatch = useCallback((bIndex, aIndex) => {
    setBatches(prev => {
      const newBatches = [...prev];
      if (newBatches[bIndex].activities.length > 1) {
        newBatches[bIndex].activities.splice(aIndex, 1);
      }
      return newBatches;
    });
  }, [setBatches]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!formalizationDate) {
      setMessage({ type: 'error', text: 'Selecione a data de formalização inicial.' });
      setLoading(false);
      return;
    }

    const cleanedBatches = batches.map(b => ({
      subject: b.subject,
      activities: b.activities.filter(a => a.trim() !== '')
    })).filter(b => b.subject.trim() !== '' && b.activities.length > 0);

    if (cleanedBatches.length === 0) {
      setMessage({ type: 'error', text: 'Adicione pelo menos uma matéria com um tópico válido.' });
      setLoading(false);
      return;
    }

    try {
      await scheduleReviews(cleanedBatches, formalizationDate);
      
      setMessage({ type: 'success', text: `Revisões em lote agendadas com sucesso no Notion!` });
      setBatches([{ subject: '', activities: [''] }]);
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
              <CalendarIcon size={16} className="text-notion-muted" /> Data de Formalização (Estudo Inicial)
            </Label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <Popover>
                <PopoverTrigger 
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-start text-left font-normal border-notion-border bg-white text-notion-text h-9 hover:bg-gray-50",
                    !formalizationDate && "text-muted-foreground"
                  )}
                >
                  {formalizationDate ? format(parseISO(formalizationDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione a data</span>}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formalizationDate ? parseISO(formalizationDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const tzOffset = date.getTimezoneOffset() * 60000; 
                        const localISOTime = (new Date(date - tzOffset)).toISOString().split('T')[0];
                        setFormalizationDate(localISOTime);
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

          <div className="flex flex-col gap-6">
            {batches.map((batch, bIndex) => {
              // Ensure legacy batches without an ID get a stable one (fallback)
              const batchKey = batch.id || `legacy-${bIndex}`;
              
              return (
                <ReviewBatchItem
                  key={batchKey}
                  batch={batch}
                  onUpdateSubject={(value) => updateBatchSubject(bIndex, value)}
                  onUpdateActivity={(aIndex, value) => updateBatchActivity(bIndex, aIndex, value)}
                  onAddActivity={() => addActivityToBatch(bIndex)}
                  onRemoveActivity={(aIndex) => removeActivityFromBatch(bIndex, aIndex)}
                  onRemoveBatch={() => removeBatch(bIndex)}
                  onDuplicateBatch={() => duplicateBatch(bIndex)}
                  onMoveUp={() => moveBatchUp(bIndex)}
                  onMoveDown={() => moveBatchDown(bIndex)}
                  canMoveUp={bIndex > 0}
                  canMoveDown={bIndex < batches.length - 1}
                  style={{ viewTransitionName: `batch-${batchKey}` }}
                />
              );
            })}
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
            className="w-full bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white transition-all duration-300 hover:shadow-lg mt-6 h-11"
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
