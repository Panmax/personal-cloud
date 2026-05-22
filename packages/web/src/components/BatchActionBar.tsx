import { useAppStore } from "../stores/app";

interface Props {
  onDelete: () => void;
  onMove: () => void;
}

export function BatchActionBar({ onDelete, onMove }: Props) {
  const { selectedIds, clearSelection } = useAppStore();
  const count = selectedIds.size;
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-blue-50 border-b">
      <span className="text-sm text-blue-700 font-medium">{count} selected</span>
      <button onClick={onMove} className="text-sm px-3 py-1 bg-white border rounded hover:bg-gray-50">Move</button>
      <button onClick={onDelete} className="text-sm px-3 py-1 bg-red-50 border border-red-200 text-red-600 rounded hover:bg-red-100">Delete</button>
      <button onClick={clearSelection} className="text-sm text-gray-500 hover:text-gray-700 ml-auto">Cancel</button>
    </div>
  );
}
