import { useState } from "react";
import { Share2, Trash2, Image, Link, Check } from "lucide-react";
import { useShares, useRevokeShare } from "../hooks/useFiles";
import { BASE } from "../api/client";

type Filter = "all" | "image";

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

function CopyBtn({ text, title, icon: Icon }: { text: string; title: string; icon: typeof Link }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors"
      title={title}
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Icon className="w-4 h-4" />}
    </button>
  );
}

export function SharesView() {
  const { data: shares = [], isLoading } = useShares();
  const revokeShare = useRevokeShare();
  const [filter, setFilter] = useState<Filter>("all");

  const filteredShares = filter === "image"
    ? shares.filter((s) => !s.password && !s.expires_at && s.file_mime_type?.startsWith("image/"))
    : shares;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 px-3 py-3 border-b border-slate-200 sm:flex-nowrap sm:gap-3 sm:px-5 sm:py-4">
        <Share2 className="w-5 h-5 text-slate-500 flex-shrink-0" />
        <h2 className="font-semibold text-slate-800 flex-1">Shared Links</h2>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setFilter("all")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === "all" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Link className="w-3 h-3" />
            All
          </button>
          <button
            onClick={() => setFilter("image")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filter === "image" ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Image className="w-3 h-3" />
            Image Links
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div>
      ) : filteredShares.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <Share2 className="w-12 h-12 mb-3 text-slate-300" />
          <p className="text-sm">{filter === "image" ? "No image links" : "No active share links"}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filteredShares.map((share) => {
            const expiry = getExpiryStatus(share.expires_at);
            const isImageLink = !share.password && !share.expires_at && share.file_mime_type?.startsWith("image/");
            const rawUrl = `${BASE}/s/${share.id}/raw`;
            return (
              <div key={share.id} className="flex items-center px-3 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors sm:px-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-700 truncate font-medium">{share.file_name || "Unknown file"}</p>
                    {isImageLink && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full font-medium flex-shrink-0">Image Link</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Created {formatDate(share.created_at)} · {share.download_count} downloads · <span className={expiry.className}>{expiry.label}</span>
                  </p>
                </div>
                {isImageLink && (
                  <CopyBtn text={rawUrl} title="Copy image URL" icon={Image} />
                )}
                <CopyBtn text={`${window.location.origin}/s/${share.id}`} title="Copy share page" icon={Link} />
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
