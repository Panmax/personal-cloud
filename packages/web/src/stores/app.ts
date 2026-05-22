import { create } from "zustand";

interface AppState {
  isAuthenticated: boolean;
  currentPath: string[];
  selectedIds: Set<string>;
  viewMode: "list" | "grid";
  currentView: "files" | "trash" | "shares";
  setAuthenticated: (v: boolean) => void;
  setCurrentPath: (path: string[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setViewMode: (mode: "list" | "grid") => void;
  setCurrentView: (view: "files" | "trash" | "shares") => void;
}

export const useAppStore = create<AppState>((set) => ({
  isAuthenticated: !!localStorage.getItem("token"),
  currentPath: [],
  selectedIds: new Set(),
  viewMode: "list",
  currentView: "files",
  setAuthenticated: (v) => set({ isAuthenticated: v }),
  setCurrentPath: (path) => set({ currentPath: path }),
  toggleSelect: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setCurrentView: (view) => set({ currentView: view }),
}));
