import { useState } from "react";
import { useFiles } from "../hooks/useFiles";
import type { FileRecord } from "../hooks/useFiles";

interface Props {
  selectedIds: string[];
  onMove: (targetId: string | null) => void;
  onClose: () => void;
}

export function MoveDialog({ selectedIds, onMove, onClose }: Props) {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [path, setPath] = useState<{ id: string | null; name: string }[]>([]);
  const { data: folders = [] } = useFiles(currentId);

  const availableFolders = folders.filter(
    (f) => f.is_dir && !selectedIds.includes(f.id)
  );

  const navigateInto = (folder: FileRecord) => {
    setPath([...path, { id: folder.id, name: folder.name }]);
    setCurrentId(folder.id);
  };

  const navigateUp = (index: number) => {
    if (index < 0) {
      setPath([]);
      setCurrentId(null);
    } else {
      setPath(path.slice(0, index + 1));
      setCurrentId(path[index].id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl flex flex-col max-h-[70vh]">
        <div className="px-4 py-3 border-b">
          <h3 className="text-lg font-medium">Move to...</h3>
          <nav className="flex items-center gap-1 text-sm text-gray-600 mt-2">
            <button onClick={() => navigateUp(-1)} className="hover:text-blue-600 font-medium">Root</button>
            {path.map((item, i) => (
              <span key={item.id} className="flex items-center gap-1">
                <span className="text-gray-400">/</span>
                <button onClick={() => navigateUp(i)} className="hover:text-blue-600">{item.name}</button>
              </span>
            ))}
          </nav>
        </div>
        <div className="flex-1 overflow-y-auto">
          {availableFolders.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No folders here</p>
          ) : (
            availableFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigateInto(folder)}
                className="w-full flex items-center px-4 py-2 hover:bg-gray-50 border-b text-left"
              >
                <span className="mr-3">📁</span>
                <span className="text-sm">{folder.name}</span>
              </button>
            ))
          )}
        </div>
        <div className="flex gap-2 px-4 py-3 border-t">
          <button
            onClick={() => onMove(currentId)}
            className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Move here
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
