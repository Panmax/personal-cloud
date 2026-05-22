import { Share2, Copy, Trash2 } from "lucide-react";
import { useShares, useRevokeShare } from "../hooks/useFiles";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
}

function getExpiryStatus(expiresAt: string | null): { label: string; className: string } {
  if (!expiresAt) return { label: "Never expires", className: "text-green-600" };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return { label: "Expired", className: "text-red-500" };
  const days = Math.ceil(diff / 86400000);
  return { label: `${days}d remaining`, className: "text-amber-600" };
}

export function SharesView() {
  const { data: shares = [], isLoading } = useShares();
  const revokeShare = useRevokeShare();

  const copyUrl = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${id}`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
        <Share2 className="w-5 h-5 text-slate-500" />
        <h2 className="font-semibold text-slate-800">Shared Links</h2>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div>
      ) : shares.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <Share2 className="w-12 h-12 mb-3 text-slate-300" />
          <p className="text-sm">No active share links</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {shares.map((share) => {
            const expiry = getExpiryStatus(share.expires_at);
            return (
              <div key={share.id} className="flex items-center px-5 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate font-medium">{share.file_name || "Unknown file"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Created {formatDate(share.created_at)} · {share.download_count} downloads · <span className={expiry.className}>{expiry.label}</span>
                  </p>
                </div>
                <button
                  onClick={() => copyUrl(share.id)}
                  className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors mr-1"
                  title="Copy link"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { if (confirm("Revoke this share link?")) revokeShare.mutate(share.id); }}
                  className="p-1.5 rounded-md hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                  title="Revoke"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
