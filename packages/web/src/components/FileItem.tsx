import type { FileRecord } from "../hooks/useFiles";
import { getFileIcon } from "../utils/icons";

interface Props {
  file: FileRecord;
  selected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onOpen: (file: FileRecord) => void;
  onContextMenu: (e: React.MouseEvent, file: FileRecord) => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export function FileItem({ file, selected, onSelect, onOpen, onContextMenu }: Props) {
  const { icon: Icon, className: iconClass } = getFileIcon(file.mime_type, !!file.is_dir);

  return (
    <div
      className={`flex items-center px-4 py-2.5 cursor-pointer transition-colors duration-150 border-b border-slate-100 select-none ${
        selected ? "bg-brand-50 border-l-2 border-l-brand-500" : "hover:bg-slate-50"
      }`}
      onClick={(e) => onSelect(file.id, e.ctrlKey || e.metaKey)}
      onDoubleClick={() => onOpen(file)}
      onContextMenu={(e) => onContextMenu(e, file)}
    >
      <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${iconClass}`} />
      <span className="flex-1 truncate text-slate-700 text-sm">{file.name}</span>
      <span className="w-24 text-right text-xs text-slate-400">{formatSize(file.size)}</span>
      <span className="w-40 text-right text-xs text-slate-400">{formatDate(file.updated_at)}</span>
    </div>
  );
}
