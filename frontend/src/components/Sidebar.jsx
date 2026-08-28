import { LayoutDashboard, LogOut, CalendarClock } from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab, onLogout }) {
  return (
    <aside className="w-64 h-screen bg-notion-sidebar border-r border-notion-border flex flex-col justify-between shrink-0">
      <div>
        <div className="flex items-center gap-2 p-4 m-2">
          <img src="/favicon-32x32.png" alt="Logo" className="w-6 h-6 rounded-sm" />
          <span className="text-sm font-semibold text-notion-text tracking-wide">Notion Dynamic Manager</span>
        </div>

        <nav className="px-2 space-y-1">
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setCurrentTab('dashboard'); }}
            className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors ${currentTab === 'dashboard' ? 'bg-gray-200 font-medium text-notion-text' : 'hover:bg-notion-hover text-notion-muted'}`}
          >
            <LayoutDashboard size={18} className={currentTab === 'dashboard' ? 'text-notion-text' : ''} />
            Painel Geral
          </a>
          
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setCurrentTab('revisions'); }}
            className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors ${currentTab === 'revisions' ? 'bg-gray-200 font-medium text-notion-text' : 'hover:bg-notion-hover text-notion-muted'}`}
          >
            <CalendarClock size={18} className={currentTab === 'revisions' ? 'text-notion-text' : ''} />
            Revisões Espaçadas
          </a>
        </nav>
      </div>

      <div className="p-4 border-t border-notion-border">
        <button 
          onClick={onLogout}
          className="flex items-center gap-2 text-xs font-medium text-red-500 hover:bg-red-50 w-full px-2 py-1.5 rounded transition-colors"
        >
          <LogOut size={16} />
          Sair da Aplicação
        </button>
      </div>
    </aside>
  );
}
