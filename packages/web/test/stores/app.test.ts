import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../../src/stores/app";

describe("app store", () => {
  beforeEach(() => {
    useAppStore.setState({
      selectedIds: new Set(),
      viewMode: "list",
      currentView: "files",
    });
  });

  it("toggles file selection", () => {
    useAppStore.getState().toggleSelect("file1");
    expect(useAppStore.getState().selectedIds.has("file1")).toBe(true);
    useAppStore.getState().toggleSelect("file1");
    expect(useAppStore.getState().selectedIds.has("file1")).toBe(false);
  });

  it("selects all files", () => {
    useAppStore.getState().selectAll(["a", "b", "c"]);
    expect(useAppStore.getState().selectedIds.size).toBe(3);
  });

  it("clears selection", () => {
    useAppStore.getState().selectAll(["a", "b"]);
    useAppStore.getState().clearSelection();
    expect(useAppStore.getState().selectedIds.size).toBe(0);
  });

  it("switches view mode", () => {
    useAppStore.getState().setViewMode("grid");
    expect(useAppStore.getState().viewMode).toBe("grid");
  });

  it("switches current view", () => {
    useAppStore.getState().setCurrentView("trash");
    expect(useAppStore.getState().currentView).toBe("trash");
  });
});
