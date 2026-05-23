import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { api, BASE } from "../api/client";

interface Props {
  fileId: string;
  fileName: string;
  mimeType?: string | null;
  onClose: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-brand-600 transition-colors flex-shrink-0">
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export function ShareDialog({ fileId, fileName, mimeType, onClose }: Props) {
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("7d");
  const [shareId, setShareId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ id: string; url: string }>("/api/shares", {
        file_id: fileId,
        password: password || undefined,
        expires_in: expiresIn || null,
      });
      setShareId(res.id);
    } finally {
      setLoading(false);
    }
  };

  const sharePageUrl = shareId ? `${window.location.origin}/s/${shareId}` : "";
  const rawUrl = shareId ? `${BASE}/s/${shareId}/raw` : "";
  const isImage = mimeType?.startsWith("image/");
  const showRawLink = shareId && !password && isImage;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-medium mb-4 text-slate-800">Share: {fileName}</h3>
        {shareId ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Share page</p>
              <div className="flex items-center gap-2">
                <input readOnly value={sharePageUrl} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700" />
                <CopyButton text={sharePageUrl} />
              </div>
            </div>

            {showRawLink && (
              <>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Direct image URL</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={rawUrl} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700" />
                    <CopyButton text={rawUrl} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Markdown</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={`![${fileName}](${rawUrl})`} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-700 font-mono" />
                    <CopyButton text={`![${fileName}](${rawUrl})`} />
                  </div>
                </div>
              </>
            )}

            <button onClick={onClose} className="w-full py-2 mt-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm text-slate-700 transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Password (optional)</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty for no password" className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <label className="block text-xs font-medium text-slate-600 mb-1">Expires</label>
            <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="1d">1 day</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="">Never</option>
            </select>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={loading} className="flex-1 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors text-sm font-medium">
                {loading ? "Creating..." : "Create Link"}
              </button>
              <button onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 text-sm text-slate-700 transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
