import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FileList } from "../../src/components/FileList";

// Mock the Zustand store
vi.mock("../../src/stores/app", () => ({
  useAppStore: () => ({
    selectedIds: new Set<string>(),
    toggleSelect: vi.fn(),
    clearSelection: vi.fn(),
    viewMode: "list" as const,
  }),
}));

const mockFiles = [
  {
    id: "1", name: "Photos", parent_id: null, is_dir: 1, size: 0,
    mime_type: null, r2_key: null, created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z", deleted_at: null,
  },
  {
    id: "2", name: "readme.md", parent_id: null, is_dir: 0, size: 512,
    mime_type: "text/markdown", r2_key: "2/1", created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z", deleted_at: null,
  },
];

describe("FileList", () => {
  it("renders empty state when no files", () => {
    render(<FileList files={[]} onOpen={vi.fn()} onContextMenu={vi.fn()} />);
    expect(screen.getByText("No files here yet")).toBeInTheDocument();
  });

  it("renders file items", () => {
    render(<FileList files={mockFiles} onOpen={vi.fn()} onContextMenu={vi.fn()} />);
    expect(screen.getByText("Photos")).toBeInTheDocument();
    expect(screen.getByText("readme.md")).toBeInTheDocument();
  });

  it("renders column headers in list mode", () => {
    render(<FileList files={mockFiles} onOpen={vi.fn()} onContextMenu={vi.fn()} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("Modified")).toBeInTheDocument();
  });
});
