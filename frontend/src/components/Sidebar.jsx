import { LayoutDashboard, LogOut, CalendarClock } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Sidebar({ currentTab, setCurrentTab, onLogout }) {
  return (
    <aside className="w-64 h-screen bg-[#202020] border-r border-[#2d2d2d] flex flex-col justify-between shrink-0 text-white">
      <div>
        <div className="flex items-center gap-2.5 p-4 m-2">
          <img src="/app-logo.png" alt="Logo" className="w-6 h-6 object-contain shrink-0" />
          <span className="text-sm font-semibold text-white tracking-wide">Notion Dynamic Manager</span>
        </div>

        <nav className="px-3 space-y-1">
          <Button 
            variant="ghost" 
            className={`w-full justify-start gap-3 h-9 transition-colors ${
              currentTab === 'dashboard' 
                ? 'bg-white/15 text-white font-medium hover:bg-white/20 hover:text-white' 
                : 'text-neutral-300 font-normal hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => setCurrentTab('dashboard')}
          >
            <LayoutDashboard size={18} className={currentTab === 'dashboard' ? 'text-white' : 'text-neutral-300'} />
            Painel Geral
          </Button>
          
          <Button 
            variant="ghost" 
            className={`w-full justify-start gap-3 h-9 transition-colors ${
              currentTab === 'reviews' 
                ? 'bg-white/15 text-white font-medium hover:bg-white/20 hover:text-white' 
                : 'text-neutral-300 font-normal hover:bg-white/10 hover:text-white'
            }`}
            onClick={() => setCurrentTab('reviews')}
          >
            <CalendarClock size={18} className={currentTab === 'reviews' ? 'text-white' : 'text-neutral-300'} />
            Revisões Espaçadas
          </Button>
        </nav>
      </div>

      <div className="p-4 border-t border-[#2d2d2d]">
        <Button 
          variant="ghost" 
          onClick={onLogout}
          className="w-full justify-start gap-2 h-9 text-red-400 hover:text-red-300 hover:bg-red-500/10 font-medium"
        >
          <LogOut size={16} />
          Sair da Aplicação
        </Button>
      </div>
    </aside>
  );
}
