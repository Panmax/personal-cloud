import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { useAppStore } from "../stores/app";

export function Layout({ children }: { children: React.ReactNode }) {
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setAuthenticated(false);
    navigate("/login");
  };

  return (
    <div className="h-screen flex bg-slate-50">
      <Sidebar onLogout={handleLogout} />
      <main className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-xl shadow-sm">
        {children}
      </main>
    </div>
  );
}
