import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Login } from "./pages/Login";
import { SharePage } from "./pages/SharePage";
import { Layout } from "./components/Layout";
import { FilesView } from "./pages/FilesView";
import { TrashView } from "./pages/TrashView";
import { SharesView } from "./pages/SharesView";
import { WebDAVView } from "./pages/WebDAVView";
import { useAppStore } from "./stores/app";
import { ToastContainer } from "./components/Toast";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/s/:shareId" element={<SharePage />} />
          <Route path="/" element={<ProtectedRoute><Layout><FilesView /></Layout></ProtectedRoute>} />
          <Route path="/trash" element={<ProtectedRoute><Layout><TrashView /></Layout></ProtectedRoute>} />
          <Route path="/shares" element={<ProtectedRoute><Layout><SharesView /></Layout></ProtectedRoute>} />
          <Route path="/webdav" element={<ProtectedRoute><Layout><WebDAVView /></Layout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </QueryClientProvider>
  );
}
