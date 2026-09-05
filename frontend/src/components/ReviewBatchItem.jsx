import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, X, Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  onRemoveBatch,
  onDuplicateBatch,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}) => {
  // Check if current subject is a preset (or empty). If it's a custom string, set select to "Outro".
  const isPreset = PRESET_SUBJECTS.includes(batch.subject) || !batch.subject;
  const initialSelectValue = isPreset ? (batch.subject || "") : "Outro";
  
  const [selectValue, setSelectValue] = useState(initialSelectValue);

  // Sync state if batch.subject changes from outside (e.g. form reset)
  useEffect(() => {
    if (!batch.subject && selectValue !== "Outro") {
      setSelectValue("");
    } else if (batch.subject && PRESET_SUBJECTS.includes(batch.subject)) {
      setSelectValue(batch.subject);
    }
  }, [batch.subject]); // selectValue removed from deps to avoid loops, it's safe here

  const handleSelectChange = (val) => {
    setSelectValue(val);
    
    if (val === "Outro") {
      onUpdateSubject(""); // Clear for the custom input
    } else {
      onUpdateSubject(val);
    }
  };

  return (
    <div className="p-4 border border-notion-border rounded-lg bg-gray-50/50 relative group/batch">
      <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 transition-opacity duration-200 group-hover/batch:opacity-100">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 h-8 w-8 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Mover para cima"
        >
          <ArrowUp size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 h-8 w-8 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Mover para baixo"
        >
          <ArrowDown size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDuplicateBatch}
          className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 h-8 w-8"
          title="Duplicar Bloco"
        >
          <Copy size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemoveBatch}
          className="text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8"
          title="Remover Bloco"
        >
          <Trash2 size={16} />
        </Button>
      </div>

      <div className="space-y-2 mt-1">
        <Label className="flex items-center gap-2 text-notion-text font-medium">
          <BookOpen size={16} className="text-notion-muted" /> Matéria
        </Label>
        
        <div className="flex gap-2 flex-col sm:flex-row items-center w-full">
          <div className="flex-1 w-full">
            <Select
              value={selectValue}
              onValueChange={handleSelectChange}
            >
              <SelectTrigger className="bg-white border-notion-border focus-visible:ring-gray-300">
                <SelectValue placeholder="Selecione uma matéria..." />
              </SelectTrigger>
              <SelectContent>
                {PRESET_SUBJECTS.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectValue === "Outro" && (
            <div className="flex-1 w-full animate-in fade-in zoom-in-95 slide-in-from-left-4 duration-300 ease-out">
              <Input 
                type="text"
                required
                value={batch.subject}
                onChange={e => onUpdateSubject(e.target.value)}
                placeholder="Digite o nome da matéria"
                className="h-10 w-full border-notion-border focus-visible:ring-gray-300 bg-white" 
                autoFocus
              />
            </div>
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
