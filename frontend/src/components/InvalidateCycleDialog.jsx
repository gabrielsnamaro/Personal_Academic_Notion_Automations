import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { invalidateReviewCycle } from '@/api/reviews.api';

export default function InvalidateCycleDialog({ cycle, isOpen, onClose, onSuccess }) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reseta os estados quando o modal abre ou fecha
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setLoading(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !cycle) return null;

  const isConfirmed = confirmText.trim() === 'INVALIDAR';

  const handleConfirm = async () => {
    if (!isConfirmed || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await invalidateReviewCycle(cycle.id, {
        subject: cycle.subject,
        activities: cycle.activities
      });

      if (onSuccess) {
        onSuccess(response, cycle);
      }
      onClose();
    } catch (err) {
      console.error('Erro ao invalidar ciclo:', err);
      const msg = err.response?.data?.error || err.message || 'Falha ao invalidar o ciclo no Notion.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !loading && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-xl border border-notion-border shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-notion-text">
                Invalidar Ciclo de Revisão
              </h3>
              <p className="text-xs text-notion-muted">
                Esta ação é irreversível e atualizará seu Notion.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumo do Ciclo Alvo */}
        <div className="bg-stone-50 border border-notion-border rounded-lg p-3 space-y-1.5 text-xs text-notion-text">
          <div className="flex items-center gap-1.5 font-semibold text-stone-800">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">{cycle.subject}</span>
          </div>
          {cycle.activities && cycle.activities.length > 0 && (
            <div className="text-[11px] text-notion-muted pl-5 space-y-0.5">
              {cycle.activities.map((act, i) => (
                <div key={i} className="truncate">• {act}</div>
              ))}
            </div>
          )}
        </div>

        {/* Alerta de Consequência */}
        <div className="bg-red-50/80 border border-red-200 rounded-lg p-3 text-xs text-red-700 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            Todas as tarefas deste ciclo serão <strong>removidas do container de revisões</strong> no Notion. 
            Caso queira fixar esse conteúdo mais tarde, será necessário cadastrar uma nova formalização inicial.
          </div>
        </div>

        {/* Erro de API */}
        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-2.5 text-xs">
            {error}
          </div>
        )}

        {/* Campo de Confirmação Textual Obrigatória */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-stone-700 block">
            Para confirmar, digite <span className="font-mono bg-stone-100 text-red-700 px-1 py-0.5 rounded text-[11px] font-bold">INVALIDAR</span> abaixo:
          </label>
          <Input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="INVALIDAR"
            disabled={loading}
            className="h-9 text-xs font-mono tracking-wider placeholder:font-sans uppercase"
            autoFocus
          />
        </div>

        {/* Ações do Rodapé */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-notion-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="text-xs h-9 px-3 text-notion-text border-notion-border hover:bg-stone-100"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={!isConfirmed || loading}
            className="text-xs h-9 px-3 bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Substituindo container...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Confirmar Invalidação
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

