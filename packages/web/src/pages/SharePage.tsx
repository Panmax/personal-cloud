import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

interface ShareInfo {
  filename: string;
  size: number;
  mime_type: string | null;
  has_password: boolean;
  download_count: number;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

const API_BASE = import.meta.env.VITE_API_BASE || "";

export function SharePage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/s/${shareId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 410 ? "Link expired" : "Not found");
        return res.json();
      })
      .then(setInfo)
      .catch((err) => setError(err.message));
  }, [shareId]);

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/s/${shareId}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = info?.filename || "download";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
        <div className="text-4xl mb-4">📄</div>
        <h2 className="text-lg font-medium mb-1">{info.filename}</h2>
        <p className="text-sm text-gray-500 mb-6">{formatSize(info.size)}</p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {info.has_password && (
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" className="w-full px-4 py-2 border rounded mb-4" />
        )}
        <button onClick={handleDownload} disabled={downloading} className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {downloading ? "Downloading..." : "Download"}
        </button>
        <p className="text-xs text-gray-400 mt-4">Downloaded {info.download_count} times</p>
      </div>
    </div>
  );
}
