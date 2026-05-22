import { useEffect, useState } from "react";
import type { FileRecord } from "../hooks/useFiles";
import { BASE } from "../api/client";

interface Props {
  file: FileRecord;
  onClose: () => void;
}

function getPreviewType(mime: string | null): "image" | "video" | "audio" | "pdf" | "text" | "none" {
  if (!mime) return "none";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/") || mime === "application/json" || mime === "application/javascript") return "text";
  return "none";
}

export function PreviewModal({ file, onClose }: Props) {
  const previewType = getPreviewType(file.mime_type);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${BASE}/api/files/${file.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        if (previewType === "text") return res.text();
        return res.blob();
      })
      .then((data) => {
        if (typeof data === "string") {
          setTextContent(data);
        } else {
          setBlobUrl(URL.createObjectURL(data));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [file.id]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleDownload = () => {
    const token = localStorage.getItem("token");
    fetch(`${BASE}/api/files/${file.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-medium truncate">{file.name}</h3>
          <div className="flex gap-2">
            <button onClick={handleDownload} className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Download</button>
            <button onClick={onClose} className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Close</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : previewType === "image" && blobUrl ? (
            <img src={blobUrl} alt={file.name} className="max-w-full max-h-full object-contain" />
          ) : previewType === "video" && blobUrl ? (
            <video src={blobUrl} controls className="max-w-full max-h-full" />
          ) : previewType === "audio" && blobUrl ? (
            <audio src={blobUrl} controls className="w-full" />
          ) : previewType === "pdf" && blobUrl ? (
            <iframe src={blobUrl} className="w-full h-full min-h-[60vh]" />
          ) : previewType === "text" && textContent !== null ? (
            <pre className="w-full h-full min-h-[60vh] overflow-auto p-4 bg-gray-50 rounded text-sm font-mono whitespace-pre-wrap">{textContent}</pre>
          ) : (
            <div className="text-center text-gray-500">
              <p className="mb-4">Preview not available for this file type</p>
              <button onClick={handleDownload} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Download</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
