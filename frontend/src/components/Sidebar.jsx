import { LayoutDashboard, ChevronsLeft, CalendarClock } from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab }) {
  return (
    <aside className="w-64 h-screen bg-notion-sidebar border-r border-notion-border flex flex-col justify-between shrink-0">
      <div>
        <div className="p-4 m-2">
          <span className="text-sm font-semibold text-notion-text tracking-wide">Workspace</span>
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
        <button className="flex items-center gap-2 text-xs font-medium text-notion-muted hover:bg-notion-hover w-full px-2 py-1.5 rounded transition-colors">
          <ChevronsLeft size={16} />
          Recolher menu
        </button>
      </div>
    </aside>
  );
}
