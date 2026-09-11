import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ReviewForm from './components/ReviewForm';
import ReviewCyclesPanel from './components/ReviewCyclesPanel';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Layers, PlusCircle } from 'lucide-react';

export default function Dashboard({ onLogout }) {
  const [currentTab, setCurrentTab] = useState('reviews');
  const [reviewSubTab, setReviewSubTab] = useState('cycles');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white text-notion-text overflow-hidden relative">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          currentTab={currentTab} 
          setCurrentTab={(tab) => {
            setCurrentTab(tab);
            setIsMobileMenuOpen(false);
          }} 
          onLogout={onLogout} 
        />
      </div>
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        <div className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 md:px-12 py-6 md:py-8">
            
            {currentTab === 'dashboard' && (
              <>
                <div className="mb-8 md:mb-12">
                  <h1 className="text-2xl md:text-4xl font-bold mb-3 tracking-tight">Painel de Automações</h1>
                  <p className="text-sm md:text-[15px] text-notion-muted font-medium leading-relaxed">
                    Gerencie suas integrações e rotinas de estudo diretamente no Notion.
                  </p>
                </div>

                <Card className="w-full border-notion-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-notion-text">Status do Sistema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-notion-muted mb-4 leading-relaxed">
                      Bem-vindo! No momento, as automações estão focadas no planejamento e organização da sua "Curva de Esquecimento".
                    </p>
                    
                    <div className="flex items-center justify-between border-t border-notion-border pt-4 mt-2">
                      <span className="text-sm font-medium text-notion-text">Módulo Ativo</span>
                      <span className="text-[11px] md:text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-md">
                        Revisões Espaçadas
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {currentTab === 'reviews' && (
              <>
                <div className="mb-6 md:mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl md:text-4xl font-bold mb-2 tracking-tight">Revisões Espaçadas</h1>
                      <p className="text-sm md:text-[15px] text-notion-muted font-medium leading-relaxed">
                        Acompanhe seus ciclos de retenção e agende novos tópicos de estudo.
                      </p>
                    </div>

                    {/* Sub-Tabs de Navegação */}
                    <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/80 self-start sm:self-auto shrink-0 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setReviewSubTab('cycles')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          reviewSubTab === 'cycles'
                            ? 'bg-white text-notion-text shadow-xs border border-stone-200'
                            : 'text-stone-500 hover:text-notion-text'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        Ciclos Ativos
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewSubTab('schedule')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          reviewSubTab === 'schedule'
                            ? 'bg-white text-notion-text shadow-xs border border-stone-200'
                            : 'text-stone-500 hover:text-notion-text'
                        }`}
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-stone-600" />
                        Agendar Revisões
                      </button>
                    </div>
                  </div>
                </div>

                {reviewSubTab === 'cycles' && (
                  <ReviewCyclesPanel onSwitchToSchedule={() => setReviewSubTab('schedule')} />
                )}

                {reviewSubTab === 'schedule' && (
                  <ReviewForm onSuccess={() => setReviewSubTab('cycles')} />
                )}
              </>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}
