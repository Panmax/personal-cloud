import { useEffect } from "react";
import type { FileRecord } from "../hooks/useFiles";

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
  const url = `/api/files/${file.id}/download`;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-medium truncate">{file.name}</h3>
          <div className="flex gap-2">
            <a href={url} download className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Download</a>
            <button onClick={onClose} className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Close</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          {previewType === "image" && <img src={url} alt={file.name} className="max-w-full max-h-full object-contain" />}
          {previewType === "video" && <video src={url} controls className="max-w-full max-h-full" />}
          {previewType === "audio" && <audio src={url} controls className="w-full" />}
          {previewType === "pdf" && <iframe src={url} className="w-full h-full min-h-[60vh]" />}
          {previewType === "text" && <iframe src={url} className="w-full h-full min-h-[60vh] font-mono text-sm" />}
          {previewType === "none" && (
            <div className="text-center text-gray-500">
              <p className="mb-4">Preview not available for this file type</p>
              <a href={url} download className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Download</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
