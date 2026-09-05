import React from 'react';
import { BookOpen, Plus, X, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const ReviewBatchItem = React.memo(({
  batch,
  onUpdateSubject,
  onUpdateActivity,
  onAddActivity,
  onRemoveActivity,
  onRemoveBatch
}) => {
  return (
    <div className="p-4 border border-notion-border rounded-lg bg-gray-50/50 relative group/batch">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemoveBatch}
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
          value={batch.subject}
          onChange={e => onUpdateSubject(e.target.value)}
          placeholder="Ex: Teoria dos Grafos e Computabilidade"
          className="border-notion-border focus-visible:ring-gray-300 pr-10 bg-white" 
        />
      </div>

      <div className="space-y-3 mt-4">
        <Label className="text-notion-text font-medium block">
          Atividades / Tópicos
        </Label>
        <div className="space-y-3">
          {batch.activities.map((atv, aIndex) => (
            <div key={aIndex} className="flex items-center gap-2">
              <Input 
                type="text"
                required
                value={atv}
                onChange={e => onUpdateActivity(aIndex, e.target.value)}
                placeholder={`Tópico ${aIndex + 1}`}
                className="border-notion-border focus-visible:ring-gray-300 bg-white"
              />
              {batch.activities.length > 1 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onRemoveActivity(aIndex)}
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
          onClick={onAddActivity}
          className="mt-1 h-8 px-2 text-notion-muted hover:text-notion-text flex items-center gap-1"
        >
          <Plus size={16} /> Adicionar tópico
        </Button>
      </div>
    </div>
  );
});

ReviewBatchItem.displayName = 'ReviewBatchItem';
