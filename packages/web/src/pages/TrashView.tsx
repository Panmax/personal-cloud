import { Trash2, RotateCcw, XCircle } from "lucide-react";
import { useTrash, useRestoreFile, usePermanentDelete, useEmptyTrash } from "../hooks/useFiles";
import { getFileIcon } from "../utils/icons";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function TrashView() {
  const { data: files = [], isLoading } = useTrash();
  const restoreFile = useRestoreFile();
  const permanentDelete = usePermanentDelete();
  const emptyTrash = useEmptyTrash();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex items-center gap-3 px-3 py-3 border-b border-slate-200 sm:px-5 sm:py-4">
        <Trash2 className="w-5 h-5 text-slate-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-800">Trash</h2>
          <p className="text-xs text-slate-400">Files are automatically deleted after 30 days</p>
        </div>
        {files.length > 0 && (
          <button
            onClick={() => { if (confirm("Empty trash? All files will be permanently deleted.")) emptyTrash.mutate(); }}
            className="text-sm px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
          >
            Empty Trash
          </button>
        )}
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div>
      ) : files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <Trash2 className="w-12 h-12 mb-3 text-slate-300" />
          <p className="text-sm">Trash is empty</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {files.map((file) => {
            const { icon: Icon, className: iconClass } = getFileIcon(file.mime_type, !!file.is_dir);
            return (
              <div key={file.id} className="flex items-center px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors sm:px-5">
                <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${iconClass}`} />
                <span className="flex-1 text-sm text-slate-700 truncate min-w-0">{file.name}</span>
                <span className="hidden sm:block text-xs text-slate-400 mr-4">{formatSize(file.size)}</span>
                <span className="hidden sm:block text-xs text-slate-400 mr-4">{formatDate(file.deleted_at!)}</span>
                <button
                  onClick={() => restoreFile.mutate(file.id)}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors mr-1 flex-shrink-0"
                  title="Restore"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { if (confirm("Permanently delete? This cannot be undone.")) permanentDelete.mutate(file.id); }}
                  className="p-1.5 rounded-md hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors flex-shrink-0"
                  title="Delete permanently"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
