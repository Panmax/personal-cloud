import { FileItem } from "./FileItem";
import { FileGridItem } from "./FileGridItem";
import type { FileRecord } from "../hooks/useFiles";
import { useAppStore } from "../stores/app";

interface Props {
  files: FileRecord[];
  onOpen: (file: FileRecord) => void;
  onContextMenu: (e: React.MouseEvent, file: FileRecord) => void;
}

export function FileList({ files, onOpen, onContextMenu }: Props) {
  const { selectedIds, toggleSelect, clearSelection, viewMode } = useAppStore();

  const handleSelect = (id: string, multi: boolean) => {
    if (!multi) clearSelection();
    toggleSelect(id);
  };

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <p className="text-sm">No files here yet</p>
      </div>
    );
  }

  if (viewMode === "grid") {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
          {files.map((file) => (
            <FileGridItem
              key={file.id}
              file={file}
              selected={selectedIds.has(file.id)}
              onSelect={handleSelect}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center px-4 py-2 text-xs text-slate-400 font-medium border-b border-slate-100 bg-slate-50/50">
        <span className="w-5 mr-3" />
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
