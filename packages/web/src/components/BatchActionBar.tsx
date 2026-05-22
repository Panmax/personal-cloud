import { useAppStore } from "../stores/app";
import { Trash2, MoveRight, X } from "lucide-react";

interface Props { onDelete: () => void; onMove: () => void; }

export function BatchActionBar({ onDelete, onMove }: Props) {
  const { selectedIds, clearSelection } = useAppStore();
  const count = selectedIds.size;
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-200 rounded-xl shadow-lg">
      <span className="text-sm text-brand-700 font-medium">{count} selected</span>
      <button onClick={onMove} className="flex items-center gap-1.5 text-sm px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors">
        <MoveRight className="w-3.5 h-3.5" /> Move
      </button>
      <button onClick={onDelete} className="flex items-center gap-1.5 text-sm px-3 py-1 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
      <button onClick={clearSelection} className="ml-auto p-1 rounded-md hover:bg-brand-100 text-brand-600 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
