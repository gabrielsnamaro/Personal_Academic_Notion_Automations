import { Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Header({ onMenuClick }) {
  return (
    <header className="h-12 border-b border-notion-border flex items-center justify-between px-4 md:px-6 bg-white sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden text-notion-muted hover:text-notion-text" onClick={onMenuClick}>
          <Menu size={18} />
        </Button>
        <div className="text-sm text-notion-muted hidden sm:block">
          Navegação / <span className="font-medium text-notion-text">Automações</span>
        </div>
        <div className="text-sm text-notion-muted sm:hidden font-medium text-notion-text">
          Automações
        </div>
      </div>
      <div className="flex items-center gap-2">
         <img src="/app-logo.png" alt="Logo" className="w-5 h-5 rounded-sm" />
         <span className="text-sm font-semibold text-notion-text hidden sm:inline">Notion Dynamic Manager</span>
      </div>
    </header>
  );
}
