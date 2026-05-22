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

export function FileGridItem({ file, selected, onSelect, onOpen, onContextMenu }: Props) {
  const { icon: Icon, className: iconClass } = getFileIcon(file.mime_type, !!file.is_dir);

  return (
    <div
      className={`flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all duration-150 border select-none ${
        selected ? "border-brand-300 bg-brand-50 shadow-sm" : "border-transparent hover:bg-slate-50 hover:border-slate-200"
      }`}
      onClick={(e) => onSelect(file.id, e.ctrlKey || e.metaKey)}
      onDoubleClick={() => onOpen(file)}
      onContextMenu={(e) => onContextMenu(e, file)}
    >
      <Icon className={`w-10 h-10 mb-2 ${iconClass}`} />
      <span className="text-sm text-slate-700 text-center truncate w-full">{file.name}</span>
      <span className="text-xs text-slate-400 mt-1">{formatSize(file.size)}</span>
    </div>
  );
}
