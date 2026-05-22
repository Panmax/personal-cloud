import { useState } from "react";
import { api } from "../api/client";

interface Props {
  fileId: string;
  fileName: string;
  onClose: () => void;
}

export function ShareDialog({ fileId, fileName, onClose }: Props) {
  const [password, setPassword] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("7d");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ id: string; url: string }>("/api/shares", {
        file_id: fileId,
        password: password || undefined,
        expires_in: expiresIn || null,
      });
      setShareUrl(`${window.location.origin}${res.url}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-medium mb-4">Share: {fileName}</h3>
        {shareUrl ? (
          <div>
            <p className="text-sm text-gray-600 mb-2">Share link created:</p>
            <div className="flex items-center gap-2 mb-4">
              <input readOnly value={shareUrl} className="flex-1 px-3 py-2 border rounded text-sm bg-gray-50" />
              <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Copy</button>
            </div>
            <button onClick={onClose} className="w-full py-2 bg-gray-100 rounded hover:bg-gray-200">Done</button>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">Password (optional)</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave empty for no password" className="w-full px-3 py-2 border rounded mb-4" />
            <label className="block text-sm font-medium mb-1">Expires</label>
            <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} className="w-full px-3 py-2 border rounded mb-4">
              <option value="1d">1 day</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="">Never</option>
            </select>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                {loading ? "Creating..." : "Create Link"}
              </button>
              <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
