import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem { id: string | null; name: string; }
interface Props { path: BreadcrumbItem[]; onNavigate: (id: string | null) => void; }

export function Breadcrumb({ path, onNavigate }: Props) {
  return (
    <nav className="flex items-center gap-1 text-sm px-3 py-2 border-b border-slate-100 overflow-x-auto sm:px-4 sm:py-2.5">
      <button onClick={() => onNavigate(null)} className="flex items-center gap-1 text-slate-500 hover:text-brand-600 transition-colors">
        <Home className="w-4 h-4" />
      </button>
      {path.map((item) => (
        <span key={item.id} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <button onClick={() => onNavigate(item.id)} className="text-slate-600 hover:text-brand-600 transition-colors">
            {item.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
