import { useState } from "react";
import type { FileRecord } from "../hooks/useFiles";
import { getFileIcon } from "../utils/icons";
import { BASE } from "../api/client";

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

function isImage(mime: string | null): boolean {
  return !!mime && mime.startsWith("image/");
}

export function FileGridItem({ file, selected, onSelect, onOpen, onContextMenu }: Props) {
  const { icon: Icon, className: iconClass } = getFileIcon(file.mime_type, !!file.is_dir);
  const [imgError, setImgError] = useState(false);
  const showThumbnail = isImage(file.mime_type) && !imgError;
  const token = localStorage.getItem("token");
  const thumbUrl = `${BASE}/api/files/${file.id}/download?token=${token}`;

  return (
    <div
      className={`flex flex-col items-center p-3 rounded-xl cursor-pointer transition-all duration-150 border select-none ${
        selected ? "border-brand-300 bg-brand-50 shadow-sm" : "border-transparent hover:bg-slate-50 hover:border-slate-200"
      }`}
      onClick={(e) => onSelect(file.id, e.ctrlKey || e.metaKey, e.shiftKey)}
      onDoubleClick={() => onOpen(file)}
      onContextMenu={(e) => onContextMenu(e, file)}
    >
      {showThumbnail ? (
        <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 bg-slate-100">
          <img
            src={thumbUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="w-full aspect-square rounded-lg flex items-center justify-center mb-2 bg-slate-50">
          <Icon className={`w-10 h-10 ${iconClass}`} />
        </div>
      )}
      <span className="text-sm text-slate-700 text-center truncate w-full">{file.name}</span>
      <span className="text-xs text-slate-400 mt-0.5">{formatSize(file.size)}</span>
    </div>
  );
}
