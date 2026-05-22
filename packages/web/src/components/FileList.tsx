import { FileItem } from "./FileItem";
import type { FileRecord } from "../hooks/useFiles";
import { useAppStore } from "../stores/app";

interface Props {
  files: FileRecord[];
  onOpen: (file: FileRecord) => void;
  onContextMenu: (e: React.MouseEvent, file: FileRecord) => void;
}

export function FileList({ files, onOpen, onContextMenu }: Props) {
  const { selectedIds, toggleSelect, clearSelection } = useAppStore();

  const handleSelect = (id: string, multi: boolean) => {
    if (!multi) clearSelection();
    toggleSelect(id);
  };

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        No files here yet
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center px-4 py-2 text-xs text-gray-500 font-medium border-b bg-gray-50">
        <span className="w-6 mr-3" />
        <span className="flex-1">Name</span>
        <span className="w-24 text-right">Size</span>
        <span className="w-40 text-right">Modified</span>
      </div>
      {files.map((file) => (
        <FileItem
          key={file.id}
          file={file}
          selected={selectedIds.has(file.id)}
          onSelect={handleSelect}
          onOpen={onOpen}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}
