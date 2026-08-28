import { LayoutDashboard, ChevronsLeft, CalendarClock } from 'lucide-react';

export default function Sidebar({ user, currentTab, setCurrentTab }) {
  return (
    <aside className="w-64 h-screen bg-notion-sidebar border-r border-notion-border flex flex-col justify-between shrink-0">
      <div>
        <div className="flex items-center gap-2 p-4 hover:bg-notion-hover cursor-pointer transition-colors m-2 rounded-md">
          <img src={user?.picture || ''} alt="Profile" className="w-6 h-6 rounded-sm bg-gray-200" />
          <span className="text-sm font-medium truncate text-notion-text">{user?.name || 'User'}</span>
        </div>

        <nav className="px-2 mt-4 space-y-1">
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
