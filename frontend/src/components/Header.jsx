export default function Header() {
  return (
    <header className="h-12 border-b border-notion-border flex items-center justify-between px-6 bg-white sticky top-0 z-10">
      <div className="text-sm text-notion-muted">
        Navegação / <span className="font-medium text-notion-text">Automações</span>
      </div>
      <div className="flex items-center gap-2">
         <img src="/logo.svg" alt="React Logo" className="w-5 h-5" />
         <span className="text-sm font-semibold text-notion-text">Notion Dynamic Manager</span>
      </div>
    </header>
  );
}
