import { create } from "zustand";
import { api } from "../api/client";
import { queryClient } from "../queryClient";

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  folderId: string | null;
}

const API_BASE = import.meta.env.VITE_API_BASE || "";
const SMALL_FILE_LIMIT = 10 * 1024 * 1024;
const MAX_CONCURRENT = 5;

function getPartSize(fileSize: number): number {
  if (fileSize < 100 * 1024 * 1024) return 10 * 1024 * 1024;
  if (fileSize < 1024 * 1024 * 1024) return 25 * 1024 * 1024;
  return 50 * 1024 * 1024;
}

interface UploadState {
  queue: UploadItem[];
  addFiles: (files: FileList | File[], folderId: string | null) => void;
  clearCompleted: () => void;
}

let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;

  while (true) {
    const state = useUploadStore.getState();
    const next = state.queue.find((i) => i.status === "pending");
    if (!next) break;

    if (next.file.size < SMALL_FILE_LIMIT) {
      await uploadSmallFile(next);
    } else {
      await uploadLargeFile(next);
    }
  }

  processing = false;
}

function updateItem(id: string, updates: Partial<UploadItem>) {
  useUploadStore.setState((state) => ({
    queue: state.queue.map((item) => (item.id === id ? { ...item, ...updates } : item)),
  }));
}

async function uploadSmallFile(item: UploadItem) {
  const formData = new FormData();
  formData.append("file", item.file);
  if (item.folderId) formData.append("parent_id", item.folderId);
  updateItem(item.id, { status: "uploading", progress: 0 });
  try {
    await api.upload<{ id: string }>("/api/files", formData);
    updateItem(item.id, { status: "done", progress: 100 });
    queryClient.invalidateQueries({ queryKey: ["files", item.folderId] });
  } catch (err) {
    updateItem(item.id, { status: "error", error: err instanceof Error ? err.message : "Upload failed" });
  }
}

async function uploadLargeFile(item: UploadItem) {
  updateItem(item.id, { status: "uploading", progress: 0 });
  const partSize = getPartSize(item.file.size);
  const partsCount = Math.ceil(item.file.size / partSize);

  try {
    const presign = await api.post<{ file_id: string; r2_key: string; upload_id: string }>("/api/upload/presign", {
      filename: item.file.name,
      size: item.file.size,
      mime_type: item.file.type || "application/octet-stream",
      parts_count: partsCount,
      parent_id: item.folderId,
    });

    const parts: { partNumber: number; etag: string }[] = [];
    let uploaded = 0;

    for (let i = 0; i < partsCount; i += MAX_CONCURRENT) {
      const batch = Array.from({ length: Math.min(MAX_CONCURRENT, partsCount - i) }, (_, j) => i + j);
      const results = await Promise.all(
        batch.map(async (partIndex) => {
          const start = partIndex * partSize;
          const end = Math.min(start + partSize, item.file.size);
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
      parent_id: item.folderId,
      parts,
    });

    updateItem(item.id, { status: "done", progress: 100 });
    queryClient.invalidateQueries({ queryKey: ["files", item.folderId] });
  } catch (err) {
    updateItem(item.id, { status: "error", error: err instanceof Error ? err.message : "Upload failed" });
  }
}

function updateBeforeUnload(queue: UploadItem[]) {
  const hasActive = queue.some((i) => i.status === "uploading" || i.status === "pending");
  if (hasActive) {
    window.onbeforeunload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
  } else {
    window.onbeforeunload = null;
  }
}

export const useUploadStore = create<UploadState>((set, get) => ({
  queue: [],
  addFiles: (fileList, folderId) => {
    const newItems: UploadItem[] = Array.from(fileList).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      progress: 0,
      status: "pending" as const,
      folderId,
    }));
    set((state) => ({ queue: [...state.queue, ...newItems] }));
    processQueue();
  },
  clearCompleted: () => {
    set((state) => ({ queue: state.queue.filter((i) => i.status !== "done") }));
  },
}));

useUploadStore.subscribe((state) => updateBeforeUnload(state.queue));
