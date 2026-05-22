import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Login } from "./pages/Login";
import { SharePage } from "./pages/SharePage";
import { Layout } from "./components/Layout";
import { FilesView } from "./pages/FilesView";
import { TrashView } from "./pages/TrashView";
import { SharesView } from "./pages/SharesView";
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

function MainApp() {
  const currentView = useAppStore((s) => s.currentView);
  return (
    <Layout>
      {currentView === "files" && <FilesView />}
      {currentView === "trash" && <TrashView />}
      {currentView === "shares" && <SharesView />}
    </Layout>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/s/:shareId" element={<SharePage />} />
          <Route path="/*" element={<ProtectedRoute><MainApp /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </QueryClientProvider>
  );
}
