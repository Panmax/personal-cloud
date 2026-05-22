interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

interface Props {
  items: UploadItem[];
  onClear: () => void;
}

export function UploadPanel({ items, onClear }: Props) {
  if (items.length === 0) return null;

  const active = items.filter((i) => i.status === "uploading" || i.status === "pending");
  const done = items.filter((i) => i.status === "done");

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white border rounded-lg shadow-lg z-40 max-h-80 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <span className="text-sm font-medium">
          Uploading {active.length > 0 ? `(${active.length})` : ""}{" "}
          {done.length > 0 && `✓ ${done.length}`}
        </span>
        {done.length > 0 && (
          <button onClick={onClear} className="text-xs text-blue-600 hover:underline">Clear</button>
        )}
      </div>
      <div className="overflow-y-auto flex-1">
        {items.map((item) => (
          <div key={item.id} className="px-3 py-2 border-b last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-sm truncate flex-1">{item.file.name}</span>
              <span className="text-xs text-gray-500 ml-2">
                {item.status === "done" ? "✓" : item.status === "error" ? "✗" : `${item.progress}%`}
              </span>
            </div>
            {item.status === "uploading" && (
              <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${item.progress}%` }} />
              </div>
            )}
            {item.error && <p className="text-xs text-red-500 mt-1">{item.error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
