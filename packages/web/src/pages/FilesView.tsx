import { useState, useCallback } from "react";
import { Search, LayoutList, LayoutGrid, FolderPlus, Upload } from "lucide-react";
import { useFiles, useDeleteFile, useBatchAction, useCreateFolder, useRenameFile, useSearch } from "../hooks/useFiles";
import { BASE, api } from "../api/client";
import type { FileRecord } from "../hooks/useFiles";
import { FileList } from "../components/FileList";
import { Breadcrumb } from "../components/Breadcrumb";
import { ContextMenu } from "../components/ContextMenu";
import { BatchActionBar } from "../components/BatchActionBar";
import { useAppStore } from "../stores/app";
import { useUpload } from "../hooks/useUpload";
import { UploadPanel } from "../components/UploadPanel";
import { PreviewModal, getPreviewType } from "../components/PreviewModal";
import { useKeyboard } from "../hooks/useKeyboard";
import { ShareDialog } from "../components/ShareDialog";
import { toast } from "../components/Toast";
import { MoveDialog } from "../components/MoveDialog";

interface BreadcrumbItem { id: string | null; name: string; }

export function FilesView() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileRecord } | null>(null);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [shareFile, setShareFile] = useState<FileRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const { data: files = [], isLoading } = useFiles(currentFolderId);
  const { data: searchResults = [] } = useSearch(searchQuery);
  const displayFiles = isSearching && searchQuery ? searchResults : files;
  const deleteFile = useDeleteFile();
  const batchAction = useBatchAction();
  const createFolder = useCreateFolder();
  const renameFile = useRenameFile();
  const { selectedIds, clearSelection, viewMode, setViewMode } = useAppStore();
  const { queue, addFiles, clearCompleted } = useUpload(currentFolderId);
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const files: File[] = [];
    const readEntry = (entry: FileSystemEntry): Promise<void> => {
      return new Promise((resolve) => {
        if (entry.isFile) {
          (entry as FileSystemFileEntry).file((f) => { files.push(f); resolve(); });
        } else if (entry.isDirectory) {
          const reader = (entry as FileSystemDirectoryEntry).createReader();
          reader.readEntries(async (entries) => {
            for (const e of entries) await readEntry(e);
            resolve();
          });
        } else {
          resolve();
        }
      });
    };

    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) entries.push(entry);
    }
    for (const entry of entries) await readEntry(entry);

    if (files.length > 0) addFiles(files);
  };
  const handleFileInput = () => {
    const input = document.createElement("input");
    input.type = "file"; input.multiple = true;
    input.onchange = () => { if (input.files) addFiles(input.files); };
    input.click();
  };

  const navigateTo = useCallback((id: string | null, name?: string) => {
    if (id === null) {
      setBreadcrumb([]);
    } else if (name) {
      const idx = breadcrumb.findIndex((b) => b.id === id);
      if (idx >= 0) { setBreadcrumb(breadcrumb.slice(0, idx + 1)); }
      else { setBreadcrumb([...breadcrumb, { id, name }]); }
    }
    setCurrentFolderId(id);
    clearSelection();
  }, [breadcrumb, clearSelection]);

  const downloadFile = (file: FileRecord) => {
    const token = localStorage.getItem("token");
    const url = `${BASE}/api/files/${file.id}/download?token=${token}`;
    const a = document.createElement("a");
    a.href = url; a.download = file.name; a.click();
  };

  const handleOpen = (file: FileRecord) => {
    if (file.is_dir) {
      navigateTo(file.id, file.name);
    } else if (getPreviewType(file.mime_type) !== "none") {
      setPreviewFile(file);
    } else {
      downloadFile(file);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileRecord) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleNewFolder = () => {
    const name = prompt("Folder name:");
    if (name) createFolder.mutate({ name, parent_id: currentFolderId || undefined });
  };

  const copyImageUrl = async (file: FileRecord) => {
    try {
      const res = await api.post<{ id: string }>("/api/shares", {
        file_id: file.id,
        expires_in: null,
      });
      const rawUrl = `${BASE}/s/${res.id}/raw`;
      await navigator.clipboard.writeText(rawUrl);
      toast("Image URL copied", "success");
    } catch {
      toast("Failed to create image URL", "error");
    }
  };

  const getContextMenuItems = (file: FileRecord) => {
    const items = [
      { label: "Rename", action: () => {
        const name = prompt("New name:", file.name);
        if (name && name !== file.name) renameFile.mutate({ id: file.id, name });
      }},
      { label: "Download", action: () => downloadFile(file) },
      { label: "Share", action: () => setShareFile(file) },
    ];
    if (file.mime_type?.startsWith("image/")) {
      items.push({ label: "Copy Image URL", action: () => copyImageUrl(file) });
    }
    items.push({ label: "Delete", action: () => deleteFile.mutate(file.id), danger: true });
    return items;
  };

  const handleBatchDelete = () => {
    batchAction.mutate({ action: "delete", ids: Array.from(selectedIds) });
    clearSelection();
  };

  const handleBatchMove = (targetId: string | null) => {
    batchAction.mutate({ action: "move", ids: Array.from(selectedIds), target: targetId || "" });
    clearSelection();
    setShowMoveDialog(false);
  };

  useKeyboard({
    onDelete: () => { if (selectedIds.size > 0) handleBatchDelete(); },
    onSelectAll: () => { useAppStore.getState().selectAll(displayFiles.map((f) => f.id)); },
    onRename: () => {
      if (selectedIds.size === 1) {
        const id = Array.from(selectedIds)[0];
        const file = files.find((f) => f.id === id);
        if (file) {
          const name = prompt("New name:", file.name);
          if (name && name !== file.name) renameFile.mutate({ id, name });
        }
      }
    },
  });

  const activeClass = "p-1.5 rounded-md bg-brand-50 text-brand-600";
  const inactiveClass = "p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors";

  return (
    <div className="flex-1 flex flex-col overflow-hidden" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setIsSearching(e.target.value.length > 0); }}
            className="w-full text-sm bg-transparent border-none focus:outline-none placeholder-slate-400"
          />
          {isSearching && (
            <button onClick={() => { setSearchQuery(""); setIsSearching(false); }} className="text-xs text-slate-400 hover:text-slate-600 flex-shrink-0">
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? activeClass : inactiveClass}
            title="List view"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? activeClass : inactiveClass}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200 mx-2" />
          <button
            onClick={handleNewFolder}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </button>
          <button
            onClick={handleFileInput}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
      </header>
      <Breadcrumb path={breadcrumb} onNavigate={(id) => {
        if (id === null) navigateTo(null);
        else { const item = breadcrumb.find((b) => b.id === id); if (item) navigateTo(item.id, item.name); }
      }} />
      <BatchActionBar onDelete={handleBatchDelete} onMove={() => setShowMoveDialog(true)} />
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div>
      ) : (
        <FileList files={displayFiles} onOpen={handleOpen} onContextMenu={handleContextMenu} />
      )}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={getContextMenuItems(contextMenu.file)} onClose={() => setContextMenu(null)} />
      )}
      {dragging && (
        <div className="fixed inset-0 bg-brand-500/10 border-4 border-dashed border-brand-500 z-50 flex items-center justify-center">
          <p className="text-xl font-medium text-brand-700">Drop files to upload</p>
        </div>
      )}
      <UploadPanel items={queue} onClear={clearCompleted} />
      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      {shareFile && <ShareDialog fileId={shareFile.id} fileName={shareFile.name} mimeType={shareFile.mime_type} onClose={() => setShareFile(null)} />}
      {showMoveDialog && (
        <MoveDialog
          selectedIds={Array.from(selectedIds)}
          onMove={handleBatchMove}
          onClose={() => setShowMoveDialog(false)}
        />
      )}
    </div>
  );
}
