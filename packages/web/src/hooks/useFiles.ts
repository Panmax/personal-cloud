import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { toast, dismissToast } from "../components/Toast";

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
    onMutate: () => { return toast("Renaming...", "loading"); },
    onSuccess: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Renamed", "success");
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
    onError: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Rename failed", "error");
    },
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
    onMutate: () => { return toast("Deleting...", "loading"); },
    onSuccess: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Moved to trash", "success");
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
    onError: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Delete failed", "error");
    },
  });
}

export function useBatchAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { action: "delete" | "move"; ids: string[]; target?: string }) =>
      api.post<{ ok: boolean }>("/api/files/batch", data),
    onMutate: (variables) => {
      const msg = variables.action === "delete" ? "Deleting..." : "Moving...";
      return toast(msg, "loading");
    },
    onSuccess: (_, variables, toastId) => {
      dismissToast(toastId as string);
      const msg = variables.action === "delete" ? "Moved to trash" : "Moved";
      toast(msg, "success");
      queryClient.invalidateQueries({ queryKey: ["files"] });
    },
    onError: (_, variables, toastId) => {
      dismissToast(toastId as string);
      const msg = variables.action === "delete" ? "Delete failed" : "Move failed";
      toast(msg, "error");
    },
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
    onMutate: () => { return toast("Restoring...", "loading"); },
    onSuccess: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Restored", "success");
      qc.invalidateQueries({ queryKey: ["trash"] });
      qc.invalidateQueries({ queryKey: ["files"] });
    },
    onError: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Restore failed", "error");
    },
  });
}

export function usePermanentDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/trash/${id}`),
    onMutate: () => { return toast("Deleting permanently...", "loading"); },
    onSuccess: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Permanently deleted", "success");
      qc.invalidateQueries({ queryKey: ["trash"] });
    },
    onError: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Delete failed", "error");
    },
  });
}

export function useEmptyTrash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<{ ok: boolean }>("/api/trash"),
    onMutate: () => { return toast("Emptying trash...", "loading"); },
    onSuccess: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Trash emptied", "success");
      qc.invalidateQueries({ queryKey: ["trash"] });
    },
    onError: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Failed to empty trash", "error");
    },
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
    onMutate: () => { return toast("Revoking...", "loading"); },
    onSuccess: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Share revoked", "success");
      qc.invalidateQueries({ queryKey: ["shares"] });
    },
    onError: (_, __, toastId) => {
      dismissToast(toastId as string);
      toast("Revoke failed", "error");
    },
  });
}

export type { FileRecord, ShareInfo };
