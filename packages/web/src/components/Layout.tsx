import { useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useAppStore } from "../stores/app";

export function Layout({ children }: { children: React.ReactNode }) {
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    setAuthenticated(false);
    navigate("/login");
  };

  return (
    <div className="h-screen flex bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onLogout={handleLogout} onNavItemClick={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col overflow-hidden bg-white md:rounded-tl-xl shadow-sm">
        <div className="md:hidden flex items-center px-3 py-2 border-b border-slate-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
