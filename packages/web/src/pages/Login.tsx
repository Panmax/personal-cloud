import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HardDrive } from "lucide-react";
import { api } from "../api/client";
import { useAppStore } from "../stores/app";

export function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post<{ token: string }>("/api/auth/login", { password });
      localStorage.setItem("token", res.token);
      setAuthenticated(true);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-3">
            <HardDrive className="w-6 h-6 text-brand-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Personal Cloud</h1>
          <p className="text-sm text-slate-400 mt-1">Enter your password to continue</p>
        </div>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
