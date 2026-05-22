import { FolderOpen, Trash2, Share2, HardDrive, LogOut } from "lucide-react";

type View = "files" | "trash" | "shares";

interface Props {
  currentView: View;
  onViewChange: (view: View) => void;
  onLogout: () => void;
}

const navItems: { view: View; label: string; icon: typeof FolderOpen }[] = [
  { view: "files", label: "All Files", icon: FolderOpen },
  { view: "trash", label: "Trash", icon: Trash2 },
  { view: "shares", label: "Shared Links", icon: Share2 },
];

export function Sidebar({ currentView, onViewChange, onLogout }: Props) {
  return (
    <aside className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-200">
        <HardDrive className="w-5 h-5 text-brand-600" />
        <span className="font-semibold text-slate-800 text-sm">Personal Cloud</span>
      </div>

      <nav className="flex-1 py-3 px-3">
        {navItems.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
              currentView === view
                ? "bg-brand-50 text-brand-700 font-medium"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-slate-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export type { View };
