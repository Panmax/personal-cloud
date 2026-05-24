import { useRef } from "react";
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
  const { selectedIds, toggleSelect, selectAll, clearSelection, viewMode } = useAppStore();
  const lastClickedIndex = useRef<number>(-1);

  const handleSelect = (id: string, multi: boolean, shift: boolean) => {
    const currentIndex = files.findIndex((f) => f.id === id);

    if (shift && lastClickedIndex.current >= 0) {
      const start = Math.min(lastClickedIndex.current, currentIndex);
      const end = Math.max(lastClickedIndex.current, currentIndex);
      const rangeIds = files.slice(start, end + 1).map((f) => f.id);
      selectAll(rangeIds);
    } else if (multi) {
      toggleSelect(id);
    } else {
      clearSelection();
      toggleSelect(id);
    }

    lastClickedIndex.current = currentIndex;
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
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
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
      <div className="flex items-center px-3 py-2 text-xs text-slate-400 font-medium border-b border-slate-100 bg-slate-50/50 sm:px-4">
        <span className="w-5 mr-3" />
        <span className="flex-1">Name</span>
        <span className="w-16 text-right sm:w-24">Size</span>
        <span className="hidden sm:block w-40 text-right">Modified</span>
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
