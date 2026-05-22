import { useEffect } from "react";

interface KeyboardActions {
  onDelete: () => void;
  onSelectAll: () => void;
  onRename: () => void;
}

export function useKeyboard(actions: KeyboardActions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        actions.onDelete();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        actions.onSelectAll();
      }
      if (e.key === "F2") {
        e.preventDefault();
        actions.onRename();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [actions]);
}
