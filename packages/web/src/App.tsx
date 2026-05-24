import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { Login } from "./pages/Login";
import { SharePage } from "./pages/SharePage";
import { Layout } from "./components/Layout";
import { FilesView } from "./pages/FilesView";
import { TrashView } from "./pages/TrashView";
import { SharesView } from "./pages/SharesView";
import { WebDAVView } from "./pages/WebDAVView";
import { useAppStore } from "./stores/app";
import { ToastContainer } from "./components/Toast";
import { UploadPanel } from "./components/UploadPanel";
import { useUploadStore } from "./stores/upload";

function ProtectedRoute() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout><Outlet /></Layout>;
}

export function App() {
  const { queue, clearCompleted } = useUploadStore();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/s/:shareId" element={<SharePage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<FilesView />} />
            <Route path="/trash" element={<TrashView />} />
            <Route path="/shares" element={<SharesView />} />
            <Route path="/webdav" element={<WebDAVView />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <UploadPanel items={queue} onClear={clearCompleted} />
      <ToastContainer />
    </QueryClientProvider>
  );
}
