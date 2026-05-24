import { useRef } from "react";
import type { FileRecord } from "../hooks/useFiles";
import { getFileIcon } from "../utils/icons";

interface Props {
  file: FileRecord;
  selected: boolean;
  onSelect: (id: string, multi: boolean, shift: boolean) => void;
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
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      const touch = e.touches[0];
      const syntheticEvent = {
        preventDefault: () => {},
        clientX: touch.clientX,
        clientY: touch.clientY,
      } as React.MouseEvent;
      onContextMenu(syntheticEvent, file);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    onSelect(file.id, e.ctrlKey || e.metaKey, e.shiftKey);
  };

  return (
    <div
      className={`flex items-center px-3 py-2.5 cursor-pointer transition-colors duration-150 border-b border-slate-100 select-none sm:px-4 ${
        selected ? "bg-brand-50 border-l-2 border-l-brand-500" : "hover:bg-slate-50"
      }`}
      onClick={handleClick}
      onDoubleClick={() => onOpen(file)}
      onContextMenu={(e) => onContextMenu(e, file)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${iconClass}`} />
      <span className="flex-1 truncate text-slate-700 text-sm">{file.name}</span>
      <span className="w-16 text-right text-xs text-slate-400 sm:w-24">{formatSize(file.size)}</span>
      <span className="hidden sm:block w-40 text-right text-xs text-slate-400">{formatDate(file.updated_at)}</span>
    </div>
  );
}
