import { useEffect, useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export interface ToastMessage {
  id: string;
  text: string;
  type: "loading" | "success" | "error";
}

let addToastFn: ((msg: Omit<ToastMessage, "id">) => string) | null = null;
let removeToastFn: ((id: string) => void) | null = null;

export function toast(text: string, type: ToastMessage["type"] = "loading"): string {
  if (addToastFn) return addToastFn({ text, type });
  return "";
}

export function dismissToast(id: string) {
  if (removeToastFn) removeToastFn(id);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (msg) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { ...msg, id }]);
      if (msg.type !== "loading") {
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
      }
      return id;
    };
    removeToastFn = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
    return () => { addToastFn = null; removeToastFn = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg shadow-md text-sm text-slate-700 animate-[slideIn_0.2s_ease-out]"
        >
          {t.type === "loading" && <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />}
          {t.type === "success" && <CheckCircle className="w-4 h-4 text-green-500" />}
          {t.type === "error" && <XCircle className="w-4 h-4 text-red-500" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
