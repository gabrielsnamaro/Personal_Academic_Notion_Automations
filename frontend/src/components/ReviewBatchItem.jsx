import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, X, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESET_SUBJECTS = [
  "Teoria dos Grafos e Computabilidade",
  "Redes de Computadores",
  "Projeto de Software",
  "Interação Humano Computador",
  "Outro"
];

export const ReviewBatchItem = React.memo(({
  batch,
  onUpdateSubject,
  onUpdateActivity,
  onAddActivity,
  onRemoveActivity,
  onRemoveBatch
}) => {
  // Check if current subject is a preset (or empty). If it's a custom string, set select to "Outro".
  const isPreset = PRESET_SUBJECTS.includes(batch.subject) || !batch.subject;
  const initialSelectValue = isPreset ? (batch.subject || "") : "Outro";
  
  const [selectValue, setSelectValue] = useState(initialSelectValue);

  // Sync state if batch.subject changes from outside (e.g. form reset)
  useEffect(() => {
    if (!batch.subject) {
      setSelectValue("");
    }
  }, [batch.subject]);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    setSelectValue(val);
    
    if (val === "Outro") {
      onUpdateSubject(""); // Clear for the custom input
    } else {
      onUpdateSubject(val);
    }
  };

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
        
        <div className="flex gap-2 flex-col sm:flex-row">
          <select
            required
            value={selectValue}
            onChange={handleSelectChange}
            className="flex h-10 w-full sm:w-1/2 rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-notion-border focus-visible:ring-gray-300"
          >
            <option value="" disabled>Selecione uma matéria...</option>
            {PRESET_SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>

          {selectValue === "Outro" && (
            <Input 
              type="text"
              required
              value={batch.subject}
              onChange={e => onUpdateSubject(e.target.value)}
              placeholder="Digite o nome da matéria"
              className="border-notion-border focus-visible:ring-gray-300 bg-white sm:w-1/2" 
              autoFocus
            />
          )}
        </div>
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
