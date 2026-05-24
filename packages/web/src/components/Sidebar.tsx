import { useNavigate, useLocation } from "react-router-dom";
import { FolderOpen, Trash2, Share2, Globe, HardDrive, LogOut } from "lucide-react";
import { useStats } from "../hooks/useFiles";

const navItems = [
  { path: "/", label: "All Files", icon: FolderOpen },
  { path: "/trash", label: "Trash", icon: Trash2 },
  { path: "/shares", label: "Shared Links", icon: Share2 },
  { path: "/webdav", label: "WebDAV", icon: Globe },
];

interface Props {
  onLogout: () => void;
  onNavItemClick?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function Sidebar({ onLogout, onNavItemClick }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: stats } = useStats();

  const handleNav = (path: string) => {
    navigate(path);
    onNavItemClick?.();
  };

  const usedBytes = stats?.storage.used ?? 0;
  const monthlyCost = stats?.cost.monthly_usd ?? 0;

  return (
    <aside className="w-56 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-200">
        <HardDrive className="w-5 h-5 text-brand-600" />
        <span className="font-semibold text-slate-800 text-sm">Personal Cloud</span>
      </div>

      <nav className="flex-1 py-3 px-3">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => handleNav(path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                active
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </nav>

      {stats && (
        <div className="px-4 py-2.5 border-t border-slate-200">
          <span className="text-[11px] text-slate-500">
            {formatBytes(usedBytes)} · {stats.counts.files} files · {stats.counts.folders} folders{monthlyCost > 0 ? ` · $${monthlyCost}/mo` : ""}
          </span>
        </div>
      )}

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
