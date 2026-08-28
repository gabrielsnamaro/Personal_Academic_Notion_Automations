import { RefreshCw } from 'lucide-react';

export default function Header({ onSync }) {
  return (
    <header className="h-12 border-b border-notion-border flex items-center justify-between px-6 bg-white sticky top-0 z-10">
      <div className="text-sm text-notion-muted">
        Workspace / <span className="font-medium text-notion-text">Dashboard</span>
      </div>
      
      <button 
        onClick={onSync}
        className="flex items-center gap-2 bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
      >
        <RefreshCw size={14} />
        Sync Automations
      </button>
    </header>
  );
}
