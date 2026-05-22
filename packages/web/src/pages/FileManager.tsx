import { useState, useCallback } from "react";
import { useFiles, useDeleteFile, useBatchAction, useCreateFolder, useRenameFile } from "../hooks/useFiles";
import type { FileRecord } from "../hooks/useFiles";
import { FileList } from "../components/FileList";
import { Breadcrumb } from "../components/Breadcrumb";
import { ContextMenu } from "../components/ContextMenu";
import { BatchActionBar } from "../components/BatchActionBar";
import { useAppStore } from "../stores/app";
import { useUpload } from "../hooks/useUpload";
import { UploadPanel } from "../components/UploadPanel";
import { PreviewModal } from "../components/PreviewModal";
import { useKeyboard } from "../hooks/useKeyboard";
import { ShareDialog } from "../components/ShareDialog";

interface BreadcrumbItem { id: string | null; name: string; }

export function FileManager() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileRecord } | null>(null);
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null);
  const [shareFile, setShareFile] = useState<FileRecord | null>(null);

  const { data: files = [], isLoading } = useFiles(currentFolderId);
  const deleteFile = useDeleteFile();
  const batchAction = useBatchAction();
  const createFolder = useCreateFolder();
  const renameFile = useRenameFile();
  const { selectedIds, clearSelection } = useAppStore();
  const { queue, addFiles, clearCompleted } = useUpload(currentFolderId);
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
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

  const handleOpen = (file: FileRecord) => {
    if (file.is_dir) { navigateTo(file.id, file.name); }
    else { setPreviewFile(file); }
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileRecord) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleNewFolder = () => {
    const name = prompt("Folder name:");
    if (name) createFolder.mutate({ name, parent_id: currentFolderId || undefined });
  };

  const getContextMenuItems = (file: FileRecord) => [
    { label: "Rename", action: () => {
      const name = prompt("New name:", file.name);
      if (name && name !== file.name) renameFile.mutate({ id: file.id, name });
    }},
    { label: "Download", action: () => window.open(`/api/files/${file.id}/download`, "_blank") },
    { label: "Share", action: () => setShareFile(file) },
    { label: "Delete", action: () => deleteFile.mutate(file.id), danger: true },
  ];

  const handleBatchDelete = () => {
    batchAction.mutate({ action: "delete", ids: Array.from(selectedIds) });
    clearSelection();
  };

  useKeyboard({
    onDelete: () => { if (selectedIds.size > 0) handleBatchDelete(); },
    onSelectAll: () => { useAppStore.getState().selectAll(files.map((f) => f.id)); },
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

  return (
    <div className="h-screen flex flex-col bg-white" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="text-lg font-bold">Personal Cloud</h1>
        <div className="flex gap-2">
          <button onClick={handleNewFolder} className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">
            New Folder
          </button>
          <button onClick={handleFileInput} className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Upload</button>
        </div>
      </header>
      <Breadcrumb path={breadcrumb} onNavigate={(id) => {
        if (id === null) navigateTo(null);
        else { const item = breadcrumb.find((b) => b.id === id); if (item) navigateTo(item.id, item.name); }
      }} />
      <BatchActionBar onDelete={handleBatchDelete} onMove={() => {}} />
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>
      ) : (
        <FileList files={files} onOpen={handleOpen} onContextMenu={handleContextMenu} />
      )}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={getContextMenuItems(contextMenu.file)} onClose={() => setContextMenu(null)} />
      )}
      {dragging && (
        <div className="fixed inset-0 bg-blue-500/10 border-4 border-dashed border-blue-500 z-50 flex items-center justify-center">
          <p className="text-xl font-medium text-blue-700">Drop files to upload</p>
        </div>
      )}
      <UploadPanel items={queue} onClear={clearCompleted} />
      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      {shareFile && <ShareDialog fileId={shareFile.id} fileName={shareFile.name} onClose={() => setShareFile(null)} />}
    </div>
  );
}
