import { CheckCircle, XCircle } from "lucide-react";

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
    <div className="fixed bottom-4 right-4 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-40 max-h-80 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/50">
        <span className="text-sm font-medium text-slate-700">
          {active.length > 0 ? `Uploading (${active.length})` : "Uploads"}{" "}
          {done.length > 0 && <span className="text-green-600">· {done.length} done</span>}
        </span>
        {done.length > 0 && (
          <button onClick={onClear} className="text-xs text-brand-600 hover:underline">Clear</button>
        )}
      </div>
      <div className="overflow-y-auto flex-1">
        {items.map((item) => (
          <div key={item.id} className="px-3 py-2 border-b border-slate-100 last:border-0">
            <div className="flex items-center justify-between">
              <span className="text-sm truncate flex-1 text-slate-700">{item.file.name}</span>
              <span className="ml-2 flex-shrink-0">
                {item.status === "done" ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : item.status === "error" ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <span className="text-xs text-slate-500">{item.progress}%</span>
                )}
              </span>
            </div>
            {item.status === "uploading" && (
              <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 transition-all" style={{ width: `${item.progress}%` }} />
              </div>
            )}
            {item.error && <p className="text-xs text-red-500 mt-1">{item.error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
