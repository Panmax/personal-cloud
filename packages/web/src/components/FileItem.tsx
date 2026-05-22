import type { FileRecord } from "../hooks/useFiles";

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
  return (
    <div
      className={`flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50 border-b ${selected ? "bg-blue-50" : ""}`}
      onClick={(e) => onSelect(file.id, e.ctrlKey || e.metaKey)}
      onDoubleClick={() => onOpen(file)}
      onContextMenu={(e) => onContextMenu(e, file)}
    >
      <span className="w-6 text-center mr-3">{file.is_dir ? "📁" : "📄"}</span>
      <span className="flex-1 truncate">{file.name}</span>
      <span className="w-24 text-right text-sm text-gray-500">{formatSize(file.size)}</span>
      <span className="w-40 text-right text-sm text-gray-500">{formatDate(file.updated_at)}</span>
    </div>
  );
}
