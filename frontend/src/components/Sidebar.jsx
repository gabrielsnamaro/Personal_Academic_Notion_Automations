import { LayoutDashboard, LogOut, CalendarClock } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Sidebar({ currentTab, setCurrentTab, onLogout }) {
  return (
    <aside className="w-64 h-screen bg-notion-sidebar border-r border-notion-border flex flex-col justify-between shrink-0">
      <div>
        <div className="flex items-center gap-2.5 p-4 m-2">
          <img src="/app-logo.png" alt="Logo" className="w-6 h-6 object-contain shrink-0" />
          <span className="text-sm font-semibold text-notion-text tracking-wide">Notion Dynamic Manager</span>
        </div>

        <nav className="px-3 space-y-1">
          <Button 
            variant={currentTab === 'dashboard' ? 'secondary' : 'ghost'} 
            className={`w-full justify-start gap-3 h-9 ${currentTab === 'dashboard' ? 'font-medium' : 'text-notion-muted font-normal hover:bg-notion-hover'}`}
            onClick={() => setCurrentTab('dashboard')}
          >
            <LayoutDashboard size={18} className={currentTab === 'dashboard' ? 'text-notion-text' : 'text-notion-muted'} />
            Painel Geral
          </Button>
          
          <Button 
            variant={currentTab === 'revisions' ? 'secondary' : 'ghost'} 
            className={`w-full justify-start gap-3 h-9 ${currentTab === 'revisions' ? 'font-medium' : 'text-notion-muted font-normal hover:bg-notion-hover'}`}
            onClick={() => setCurrentTab('revisions')}
          >
            <CalendarClock size={18} className={currentTab === 'revisions' ? 'text-notion-text' : 'text-notion-muted'} />
            Revisões Espaçadas
          </Button>
        </nav>
      </div>

      <div className="p-4 border-t border-notion-border">
        <Button 
          variant="ghost" 
          onClick={onLogout}
          className="w-full justify-start gap-2 h-9 text-red-500 hover:text-red-600 hover:bg-red-50 font-medium"
        >
          <LogOut size={16} />
          Sair da Aplicação
        </Button>
      </div>
    </aside>
  );
}
