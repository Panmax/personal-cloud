import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || "";
const SMALL_FILE_LIMIT = 10 * 1024 * 1024;
const PART_SIZE = 10 * 1024 * 1024;
const MAX_CONCURRENT = 3;

export function useUpload(currentFolderId: string | null) {
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const queryClient = useQueryClient();

  const updateItem = (id: string, updates: Partial<UploadItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const uploadSmallFile = async (item: UploadItem) => {
    const formData = new FormData();
    formData.append("file", item.file);
    if (currentFolderId) formData.append("parent_id", currentFolderId);
    updateItem(item.id, { status: "uploading", progress: 0 });
    try {
      await api.upload<{ id: string }>("/api/files", formData);
      updateItem(item.id, { status: "done", progress: 100 });
    } catch (err) {
      updateItem(item.id, { status: "error", error: err instanceof Error ? err.message : "Upload failed" });
    }
  };

  const uploadLargeFile = async (item: UploadItem) => {
    updateItem(item.id, { status: "uploading", progress: 0 });
    const partsCount = Math.ceil(item.file.size / PART_SIZE);

    try {
      const presign = await api.post<{ file_id: string; r2_key: string; upload_id: string }>("/api/upload/presign", {
        filename: item.file.name,
        size: item.file.size,
        mime_type: item.file.type || "application/octet-stream",
        parts_count: partsCount,
        parent_id: currentFolderId,
      });

      const parts: { partNumber: number; etag: string }[] = [];
      let uploaded = 0;

      for (let i = 0; i < partsCount; i += MAX_CONCURRENT) {
        const batch = Array.from({ length: Math.min(MAX_CONCURRENT, partsCount - i) }, (_, j) => i + j);
        const results = await Promise.all(
          batch.map(async (partIndex) => {
            const start = partIndex * PART_SIZE;
            const end = Math.min(start + PART_SIZE, item.file.size);
            const blob = item.file.slice(start, end);
            const token = localStorage.getItem("token");
            const res = await fetch(
              `${API_BASE}/api/upload/part?key=${encodeURIComponent(presign.r2_key)}&uploadId=${presign.upload_id}&partNumber=${partIndex + 1}`,
              { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: blob }
            );
            if (!res.ok) throw new Error("Part upload failed");
            const etag = res.headers.get("etag") || "";
            uploaded++;
            updateItem(item.id, { progress: Math.round((uploaded / partsCount) * 100) });
            return { partNumber: partIndex + 1, etag };
          })
        );
        parts.push(...results);
      }

      await api.post("/api/upload/complete", {
        file_id: presign.file_id,
        r2_key: presign.r2_key,
        upload_id: presign.upload_id,
        filename: item.file.name,
        size: item.file.size,
        mime_type: item.file.type || "application/octet-stream",
        parent_id: currentFolderId,
        parts,
      });

      updateItem(item.id, { status: "done", progress: 100 });
    } catch (err) {
      updateItem(item.id, { status: "error", error: err instanceof Error ? err.message : "Upload failed" });
    }
  };

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newItems: UploadItem[] = Array.from(fileList).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setQueue((prev) => [...prev, ...newItems]);

    // Process sequentially
    (async () => {
      for (const item of newItems) {
        if (item.file.size < SMALL_FILE_LIMIT) {
          await uploadSmallFile(item);
        } else {
          await uploadLargeFile(item);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["files", currentFolderId] });
    })();
  }, [currentFolderId, queryClient]);

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((i) => i.status !== "done"));
  };

  return { queue, addFiles, clearCompleted };
}

export type { UploadItem };
