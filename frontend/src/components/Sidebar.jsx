import { LayoutDashboard, BookOpen, Settings, ChevronsLeft, CircleUserRound } from 'lucide-react';

export default function Sidebar({ user }) {
  return (
    <aside className="w-64 h-screen bg-notion-sidebar border-r border-notion-border flex flex-col justify-between shrink-0">
      <div>
        {/* User Profile */}
        <div className="flex items-center gap-2 p-4 hover:bg-notion-hover cursor-pointer transition-colors m-2 rounded-md">
          <img src={user?.picture || ''} alt="Profile" className="w-6 h-6 rounded-sm bg-gray-200" />
          <span className="text-sm font-medium truncate">{user?.name || 'Alex Morgan'}</span>
        </div>

        {/* Navigation */}
        <nav className="px-2 mt-4 space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-1.5 bg-gray-100 rounded-md text-sm font-medium">
            <LayoutDashboard size={18} className="text-notion-muted" />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-1.5 hover:bg-notion-hover rounded-md text-sm text-notion-muted transition-colors">
            <BookOpen size={18} />
            College Tasks
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-1.5 hover:bg-notion-hover rounded-md text-sm text-notion-muted transition-colors">
            <Settings size={18} />
            Settings
          </a>
        </nav>
      </div>

      {/* Collapse button */}
      <div className="p-4 border-t border-notion-border">
        <button className="flex items-center gap-2 text-xs font-medium text-notion-muted hover:bg-notion-hover w-full px-2 py-1.5 rounded transition-colors">
          <ChevronsLeft size={16} />
          Collapse sidebar
        </button>
      </div>
    </aside>
  );
}
