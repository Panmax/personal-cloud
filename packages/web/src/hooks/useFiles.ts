import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

interface FileRecord {
  id: string;
  name: string;
  parent_id: string | null;
  is_dir: number;
  size: number;
  mime_type: string | null;
  r2_key: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function useFiles(parentId: string | null) {
  return useQuery({
    queryKey: ["files", parentId],
    queryFn: () => {
      const params = parentId ? `?parent_id=${parentId}` : "";
      return api.get<{ files: FileRecord[] }>(`/api/files${params}`);
    },
    select: (data) => data.files,
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; parent_id?: string }) =>
      api.post<{ id: string }>("/api/files", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["files", variables.parent_id || null] });
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<{ ok: boolean }>(`/api/files/${id}`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["files"] }); },
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parent_id }: { id: string; parent_id: string | null }) =>
      api.patch<{ ok: boolean }>(`/api/files/${id}`, { parent_id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["files"] }); },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/files/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["files"] }); },
  });
}

export function useBatchAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { action: "delete" | "move"; ids: string[]; target?: string }) =>
      api.post<{ ok: boolean }>("/api/files/batch", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["files"] }); },
  });
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => api.get<{ files: FileRecord[] }>(`/api/search?q=${encodeURIComponent(query)}`),
    select: (data) => data.files,
    enabled: query.length > 0,
  });
}

export function useTrash() {
  return useQuery({
    queryKey: ["trash"],
    queryFn: () => api.get<{ files: FileRecord[] }>("/api/trash"),
    select: (data) => data.files,
  });
}

export function useRestoreFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: boolean }>(`/api/trash/${id}/restore`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: ["files"] });
    },
  });
}

export function usePermanentDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/trash/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["trash"] }); },
  });
}

interface ShareInfo {
  id: string;
  file_id: string;
  file_name: string | null;
  password: string | null;
  expires_at: string | null;
  download_count: number;
  created_at: string;
}

export function useShares() {
  return useQuery({
    queryKey: ["shares"],
    queryFn: () => api.get<{ shares: ShareInfo[] }>("/api/shares"),
    select: (data) => data.shares,
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/shares/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shares"] }); },
  });
}

export type { FileRecord, ShareInfo };
