import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RefreshCw, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon, 
  BookOpen, 
  Layers,
  Search,
  X,
  Trash2,
  ArrowUpDown
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getActiveReviewCycles, getReviewCyclesCache } from '@/api/reviews.api';
import InvalidateCycleDialog from './InvalidateCycleDialog';

// Função auxiliar pura para calcular dias de atraso ou antecedência
const getDaysDiff = (targetDateStr, todayStr) => {
  if (!targetDateStr || !todayStr) return 0;
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const [dY, dM, dD] = targetDateStr.split('-').map(Number);
  const dateToday = Date.UTC(tY, tM - 1, tD);
  const dateTarget = Date.UTC(dY, dM - 1, dD);
  return Math.round((dateToday - dateTarget) / (24 * 60 * 60 * 1000));
};

// Formatar data YYYY-MM-DD para DD/MM/AAAA
const formatDateBR = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

export default function ReviewCyclesPanel({ onSwitchToSchedule }) {
  const [data, setData] = useState(() => getReviewCyclesCache());
  const [loading, setLoading] = useState(() => !getReviewCyclesCache());
  const [error, setError] = useState(null);
  
  // Filtros rápidos e controles de busca
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('next-asc');

  // Controle do modal de invalidação e feedback
  const [cycleToInvalidate, setCycleToInvalidate] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Obter data local atual no formato YYYY-MM-DD
  const todayStr = useMemo(() => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    return new Date(today - tzOffset).toISOString().split('T')[0];
  }, []);

  const fetchCycles = useCallback(async (forceRefresh = false) => {
    if (forceRefresh || !getReviewCyclesCache()) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await getActiveReviewCycles({ forceRefresh });
      setData(response);
    } catch (err) {
      console.error('Erro ao carregar ciclos de revisão:', err);
      setError(err.response?.data?.error || err.message || 'Falha ao buscar ciclos de revisão no Notion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!data) {
      fetchCycles(false);
    }
  }, [data, fetchCycles]);

  // Analisar ciclos e verificar atrasos
  const processedCycles = useMemo(() => {
    if (!data?.cycles) return [];

    return data.cycles.map(cycle => {
      let hasOverdue = false;
      let overdueMilestones = [];

      const milestonesWithStatus = (cycle.milestones || []).map(m => {
        const isPending = m.status === 'pending';
        const daysOverdue = isPending ? getDaysDiff(m.date, todayStr) : 0;
        const isOverdue = isPending && daysOverdue > 0;
        const isToday = isPending && daysOverdue === 0;
        const isFuture = isPending && daysOverdue < 0;

        if (isOverdue) {
          hasOverdue = true;
          overdueMilestones.push({ ...m, daysOverdue });
        }

        return {
          ...m,
          isPending,
          isOverdue,
          isToday,
          isFuture,
          daysOverdue
        };
      });

      return {
        ...cycle,
        hasOverdue,
        overdueMilestones,
        milestones: milestonesWithStatus
      };
    });
  }, [data, todayStr]);

  // Extrair lista única de matérias disponíveis
  const availableSubjects = useMemo(() => {
    if (!processedCycles) return [];
    return Array.from(new Set(processedCycles.map(c => c.subject).filter(Boolean))).sort();
  }, [processedCycles]);

  // Filtragem dos ciclos (Estágio/Atraso + Busca + Matéria + Intervalo de Data Inicial e Final)
  const filteredCycles = useMemo(() => {
    return processedCycles.filter(cycle => {
      // 1. Filtro rápido de status / estágio
      if (activeFilter === 'overdue' && !cycle.hasOverdue) return false;
      if (activeFilter === 'stage1' && cycle.stage !== 'STAGE_1_INITIAL') return false;
      if (activeFilter === 'stage2' && cycle.stage !== 'STAGE_2_WEEKLY') return false;
      if (activeFilter === 'stage3' && cycle.stage !== 'STAGE_3_MONTHLY') return false;

      // 2. Filtro por matéria selecionada
      if (selectedSubject !== 'all' && cycle.subject !== selectedSubject) return false;

      // 3. Filtro textual de busca (matéria ou tópicos)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesSubject = cycle.subject.toLowerCase().includes(query);
        const matchesTopic = (cycle.activities || []).some(a => a.toLowerCase().includes(query));
        if (!matchesSubject && !matchesTopic) return false;
      }

      // 4. Filtro por intervalo de datas (Data Inicial e Data Final)
      if (startDate || endDate) {
        const effectiveStart = (startDate && endDate && startDate > endDate) ? endDate : startDate;
        const effectiveEnd = (startDate && endDate && startDate > endDate) ? startDate : endDate;

        // Busca ciclos que contenham tarefas de revisão dentro do intervalo estipulado
        const hasTaskInRange = (cycle.milestones || []).some(m => {
          if (!m.date) return false;
          if (effectiveStart && m.date < effectiveStart) return false;
          if (effectiveEnd && m.date > effectiveEnd) return false;
          return true;
        });

        if (!hasTaskInRange) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'next-asc') {
        const dateA = a.nextPendingReview || '9999-99-99';
        const dateB = b.nextPendingReview || '9999-99-99';
        return dateA.localeCompare(dateB);
      }
      if (sortBy === 'next-desc') {
        const dateA = a.nextPendingReview || '0000-00-00';
        const dateB = b.nextPendingReview || '0000-00-00';
        return dateB.localeCompare(dateA);
      }
      if (sortBy === 'formalization-desc') {
        const dateA = a.inferredBaseDate || '0000-00-00';
        const dateB = b.inferredBaseDate || '0000-00-00';
        return dateB.localeCompare(dateA);
      }
      if (sortBy === 'formalization-asc') {
        const dateA = a.inferredBaseDate || '9999-99-99';
        const dateB = b.inferredBaseDate || '9999-99-99';
        return dateA.localeCompare(dateB);
      }
      if (sortBy === 'subject-asc') {
        return a.subject.localeCompare(b.subject, 'pt-BR');
      }
      if (sortBy === 'subject-desc') {
        return b.subject.localeCompare(a.subject, 'pt-BR');
      }
      return 0;
    });
  }, [processedCycles, activeFilter, selectedSubject, searchTerm, startDate, endDate, sortBy]);

  const totalOverdueCount = useMemo(() => {
    return processedCycles.filter(c => c.hasOverdue).length;
  }, [processedCycles]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || 
    selectedSubject !== 'all' || 
    startDate ||
    endDate ||
    activeFilter !== 'all' ||
    sortBy !== 'next-asc'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSubject('all');
    setStartDate('');
    setEndDate('');
    setActiveFilter('all');
    setSortBy('next-asc');
  };

  const getStageBadge = (stage) => {
    switch (stage) {
      case 'STAGE_1_INITIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Estágio 1 • Diário (1d, 7d, 30d)
          </span>
        );
      case 'STAGE_2_WEEKLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Estágio 2 • Semanal (7d, 30d)
          </span>
        );
      case 'STAGE_3_MONTHLY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Estágio 3 • Mensal (30d)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Atípico • Recalcular
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 w-full">
      
      {/* Barra Superior de Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-notion-border">
        <div>
          <h2 className="text-xl font-bold text-notion-text flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Ciclos de Revisão Ativos
          </h2>
          <p className="text-xs sm:text-sm text-notion-muted">
            Monitoramento inteligente baseado na Curva do Esquecimento de Ebbinghaus.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCycles(true)}
            disabled={loading}
            className="text-xs h-9 px-3 text-notion-text border-notion-border hover:bg-stone-100 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>

          {onSwitchToSchedule && (
            <Button
              size="sm"
              onClick={onSwitchToSchedule}
              className="text-xs h-9 px-3 bg-notion-text hover:bg-stone-800 text-white transition-colors"
            >
              + Novo Agendamento
            </Button>
          )}
        </div>
      </div>

      {/* Mensagem de Sucesso (Invalidação ou Sincronização) */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs flex items-center justify-between animate-in fade-in duration-200 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSuccessMessage(null)} 
            className="text-emerald-600 hover:text-emerald-800 cursor-pointer p-0.5"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Alerta de Revisões Atrasadas */}
      {!loading && totalOverdueCount > 0 && (
        <div className="bg-red-50/90 border border-red-200 rounded-xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
          <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-red-900">
                Atenção: Você tem {totalOverdueCount} ciclo{totalOverdueCount > 1 ? 's' : ''} com prazo vencido!
              </h3>
              <button
                type="button"
                onClick={() => setActiveFilter(activeFilter === 'overdue' ? 'all' : 'overdue')}
                className="text-xs font-semibold text-red-700 hover:text-red-900 underline underline-offset-2 transition-colors cursor-pointer"
              >
                {activeFilter === 'overdue' ? 'Ver todos os ciclos' : 'Filtrar apenas atrasados'}
              </button>
            </div>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              Tarefas de revisão pendentes no Notion cujo prazo expirou precisam ser realizadas para não comprometer a retenção do conteúdo estudado.
            </p>
          </div>
        </div>
      )}

      {/* Estado de Erro */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold">Não foi possível carregar as revisões do Notion</p>
            <p className="text-amber-700">{error}</p>
          </div>
        </div>
      )}

      {/* Resumo Métrico */}
      {data?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'all' 
                ? 'bg-stone-100/90 border-stone-400 shadow-xs' 
                : 'bg-white border-notion-border hover:bg-stone-50'
            }`}
          >
            <span className="text-[11px] font-medium text-notion-muted block uppercase tracking-wider">Total de Ciclos</span>
            <span className="text-xl font-bold text-notion-text mt-1 block">{data.summary.totalCycles}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('stage1')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'stage1' 
                ? 'bg-blue-100/70 border-blue-400 shadow-xs' 
                : 'bg-white border-notion-border hover:bg-blue-50/50'
            }`}
          >
            <span className="text-[11px] font-medium text-blue-700 block uppercase tracking-wider">Estágio Diário (1d)</span>
            <span className="text-xl font-bold text-blue-900 mt-1 block">{data.summary.stage1Initial || 0}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('stage2')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'stage2' 
                ? 'bg-indigo-100/70 border-indigo-400 shadow-xs' 
                : 'bg-white border-notion-border hover:bg-indigo-50/50'
            }`}
          >
            <span className="text-[11px] font-medium text-indigo-700 block uppercase tracking-wider">Estágio Semanal (7d)</span>
            <span className="text-xl font-bold text-indigo-900 mt-1 block">{data.summary.stage2Weekly}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('stage3')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeFilter === 'stage3' 
                ? 'bg-emerald-100/70 border-emerald-400 shadow-xs' 
                : 'bg-white border-notion-border hover:bg-emerald-50/50'
            }`}
          >
            <span className="text-[11px] font-medium text-emerald-700 block uppercase tracking-wider">Estágio Mensal (30d)</span>
            <span className="text-xl font-bold text-emerald-900 mt-1 block">{data.summary.stage3Monthly}</span>
          </button>
        </div>
      )}

      {/* Barra de Pesquisa e Filtros no Canto (Padrão shadcn/ui) */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2.5 bg-stone-50/90 p-3 rounded-xl border border-notion-border shadow-xs">
        
        {/* Campo de Busca em Matérias e Tópicos */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar por matéria ou tópicos estudados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs bg-white border-notion-border text-notion-text placeholder:text-stone-400"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              title="Limpar pesquisa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Grupo de Filtros no Canto da Barra */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          
          {/* Ordenação dos Ciclos (Select shadcn) */}
          <div className="w-full sm:w-44 shrink-0">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 text-xs bg-white border-notion-border text-notion-text font-normal">
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <SelectValue placeholder="Ordenar por" />
                </div>
              </SelectTrigger>
              <SelectContent className="text-xs">
                <SelectItem value="next-asc">Próx. mais recente</SelectItem>
                <SelectItem value="next-desc">Próx. mais distante</SelectItem>
                <SelectItem value="formalization-desc">Formalização (recente)</SelectItem>
                <SelectItem value="formalization-asc">Formalização (antiga)</SelectItem>
                <SelectItem value="subject-asc">Matéria (A - Z)</SelectItem>
                <SelectItem value="subject-desc">Matéria (Z - A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de Matéria (Select shadcn) */}
          <div className="w-full sm:w-44 shrink-0">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="h-9 text-xs bg-white border-notion-border text-notion-text font-normal">
                <SelectValue placeholder="Todas as matérias" />
              </SelectTrigger>
              <SelectContent className="max-h-64 text-xs">
                <SelectItem value="all">Todas as matérias</SelectItem>
                {availableSubjects.map((subjectName) => (
                  <SelectItem key={subjectName} value={subjectName}>
                    {subjectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro: Data Inicial (De) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 text-xs px-2.5 bg-white border-notion-border flex items-center gap-1.5 font-normal shrink-0 transition-colors ${
                  startDate ? 'text-indigo-700 font-semibold border-indigo-300 bg-indigo-50/50' : 'text-stone-600'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>De: {startDate ? formatDateBR(startDate) : 'Início'}</span>
                {startDate && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStartDate('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        setStartDate('');
                      }
                    }}
                    className="ml-0.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                    title="Limpar data inicial"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="flex items-center justify-between px-2 py-1 border-b text-xs font-semibold text-stone-700">
                <span>Data Inicial</span>
                {startDate && (
                  <button
                    type="button"
                    onClick={() => setStartDate('')}
                    className="text-[11px] text-red-600 hover:underline cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <Calendar
                mode="single"
                selected={startDate ? parseISO(startDate) : undefined}
                onSelect={(d) => {
                  if (d) {
                    const tzOffset = d.getTimezoneOffset() * 60000;
                    setStartDate(new Date(d - tzOffset).toISOString().split('T')[0]);
                  } else {
                    setStartDate('');
                  }
                }}
                locale={ptBR}
                className="rounded-md"
              />
            </PopoverContent>
          </Popover>

          {/* Filtro: Data Final (Até) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 text-xs px-2.5 bg-white border-notion-border flex items-center gap-1.5 font-normal shrink-0 transition-colors ${
                  endDate ? 'text-indigo-700 font-semibold border-indigo-300 bg-indigo-50/50' : 'text-stone-600'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>Até: {endDate ? formatDateBR(endDate) : 'Fim'}</span>
                {endDate && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEndDate('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        setEndDate('');
                      }
                    }}
                    className="ml-0.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                    title="Limpar data final"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="flex items-center justify-between px-2 py-1 border-b text-xs font-semibold text-stone-700">
                <span>Data Final</span>
                {endDate && (
                  <button
                    type="button"
                    onClick={() => setEndDate('')}
                    className="text-[11px] text-red-600 hover:underline cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <Calendar
                mode="single"
                selected={endDate ? parseISO(endDate) : undefined}
                onSelect={(d) => {
                  if (d) {
                    const tzOffset = d.getTimezoneOffset() * 60000;
                    setEndDate(new Date(d - tzOffset).toISOString().split('T')[0]);
                  } else {
                    setEndDate('');
                  }
                }}
                locale={ptBR}
                className="rounded-md"
              />
            </PopoverContent>
          </Popover>

          {/* Botão de Limpar Todos os Filtros */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-2.5 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 shrink-0"
              title="Limpar todos os filtros ativos"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 py-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 bg-stone-100 animate-pulse rounded-xl border border-stone-200" />
          ))}
        </div>
      )}

      {/* Estado Vazio */}
      {!loading && filteredCycles.length === 0 && (
        <div className="text-center py-16 px-4 border border-dashed border-notion-border rounded-2xl bg-stone-50/50">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-notion-text">Nenhum ciclo encontrado</h3>
          <p className="text-xs text-notion-muted max-w-md mx-auto mt-1 mb-4">
            {hasActiveFilters 
              ? 'Nenhuma revisão corresponde aos filtros selecionados (busca, matéria ou intervalo de datas).'
              : activeFilter === 'overdue' 
                ? 'Parabéns! Você não possui nenhuma revisão atrasada no momento.' 
                : 'Não há revisões agendadas ativas no container do Notion.'}
          </p>
          {hasActiveFilters ? (
            <Button size="sm" variant="outline" onClick={handleResetFilters} className="text-xs">
              Limpar Filtros
            </Button>
          ) : onSwitchToSchedule && activeFilter !== 'overdue' && (
            <Button size="sm" onClick={onSwitchToSchedule} className="text-xs bg-notion-text text-white">
              Agendar Primeira Revisão
            </Button>
          )}
        </div>
      )}

      {/* Grid de Ciclos no Desktop (Ocupa mais largura com 2 colunas amplas) */}
      {!loading && filteredCycles.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredCycles.map(cycle => (
            <Card 
              key={cycle.id} 
              className={`border transition-all duration-200 ${
                cycle.hasOverdue 
                  ? 'border-red-300 bg-red-50/20 shadow-xs' 
                  : 'border-notion-border bg-white shadow-xs hover:border-stone-400'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold text-notion-text flex items-center gap-2">
                      <span>{cycle.subject}</span>
                    </CardTitle>
                    {getStageBadge(cycle.stage)}
                    
                    {cycle.hasOverdue && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        Atrasada!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
                    {cycle.inferredBaseDate && (
                      <span className="text-[11px] text-notion-muted flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5 text-stone-400" />
                        Estudo: <strong className="font-semibold text-stone-600">{formatDateBR(cycle.inferredBaseDate)}</strong>
                      </span>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCycleToInvalidate(cycle)}
                      className="h-7 px-2 text-[11px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors cursor-pointer shrink-0 font-medium"
                      title="Invalidar este ciclo de estudo"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Invalidar
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Stepper dos 3 Marcos da Curva de Esquecimento */}
                <div className="bg-stone-50/80 rounded-xl p-3 border border-stone-200/70">
                  <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Marcos de Repetição Espaçada</span>
                    {cycle.recalculationSuggested && (
                      <span className="text-amber-700 text-[10px] font-bold">⚠️ Requer Recálculo</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {cycle.milestones.map((m, idx) => {
                      const isDone = m.status === 'completed' || m.status === 'completed_inferred';
                      
                      let bgStyle = "bg-white border-stone-200 text-stone-700";
                      let icon = <Clock className="w-3.5 h-3.5 text-stone-400" />;
                      let statusText = "Pendente";

                      if (isDone) {
                        bgStyle = "bg-emerald-50/60 border-emerald-200 text-emerald-900";
                        icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
                        statusText = "Concluída";
                      } else if (m.isOverdue) {
                        bgStyle = "bg-red-100/60 border-red-300 text-red-900 font-semibold";
                        icon = <AlertCircle className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />;
                        statusText = `Atrasada há ${m.daysOverdue} dia${m.daysOverdue > 1 ? 's' : ''}`;
                      } else if (m.isToday) {
                        bgStyle = "bg-amber-100/60 border-amber-300 text-amber-900 font-semibold";
                        icon = <Clock className="w-4 h-4 text-amber-600 shrink-0" />;
                        statusText = "Vence hoje!";
                      } else {
                        bgStyle = "bg-blue-50/40 border-blue-200 text-blue-900";
                        icon = <CalendarIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
                        const daysLeft = Math.abs(m.daysOverdue);
                        statusText = `Em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`;
                      }

                      return (
                        <div 
                          key={idx} 
                          className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between gap-1.5 transition-colors ${bgStyle}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] uppercase tracking-wide">
                              {m.label}
                            </span>
                            {icon}
                          </div>
                          
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-[11px] font-semibold">{formatDateBR(m.date)}</span>
                            <span className="text-[10px] font-medium opacity-90 truncate">{statusText}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tópicos de Estudo */}
                {cycle.activities && cycle.activities.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block mb-1.5">
                      Tópicos estudados ({cycle.activities.length}):
                    </span>
                    <ul className="space-y-1">
                      {cycle.activities.map((act, aIdx) => (
                        <li key={aIdx} className="text-xs text-notion-text flex items-start gap-2 bg-stone-50/60 py-1 px-2.5 rounded-md border border-stone-100">
                          <span className="text-stone-400 mt-0.5">•</span>
                          <span className="leading-snug">{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Confirmação Segura de Invalidação */}
      <InvalidateCycleDialog
        cycle={cycleToInvalidate}
        isOpen={Boolean(cycleToInvalidate)}
        onClose={() => setCycleToInvalidate(null)}
        onSuccess={(res, invCycle) => {
          setSuccessMessage(`Ciclo de "${invCycle.subject}" invalidado com sucesso!`);
          fetchCycles(true);
          setTimeout(() => setSuccessMessage(null), 6000);
        }}
      />

    </div>
  );
}
