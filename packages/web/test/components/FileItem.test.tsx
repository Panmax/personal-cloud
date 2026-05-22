import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileItem } from "../../src/components/FileItem";

const mockFile = {
  id: "1",
  name: "document.pdf",
  parent_id: null,
  is_dir: 0,
  size: 1024000,
  mime_type: "application/pdf",
  r2_key: "1/1",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T10:30:00Z",
  deleted_at: null,
};

const mockFolder = {
  ...mockFile,
  id: "2",
  name: "Documents",
  is_dir: 1,
  size: 0,
  mime_type: null,
  r2_key: null,
};

describe("FileItem", () => {
  const defaultProps = {
    file: mockFile,
    selected: false,
    onSelect: vi.fn(),
    onOpen: vi.fn(),
    onContextMenu: vi.fn(),
  };

  it("renders file name", () => {
    render(<FileItem {...defaultProps} />);
    expect(screen.getByText("document.pdf")).toBeInTheDocument();
  });

  it("renders formatted size", () => {
    render(<FileItem {...defaultProps} />);
    expect(screen.getByText("1000.0 KB")).toBeInTheDocument();
  });

  it("shows selected state", () => {
    const { container } = render(<FileItem {...defaultProps} selected={true} />);
    expect(container.firstChild).toHaveClass("bg-brand-50");
  });

  it("calls onSelect on click", () => {
    render(<FileItem {...defaultProps} />);
    fireEvent.click(screen.getByText("document.pdf"));
    expect(defaultProps.onSelect).toHaveBeenCalledWith("1", false);
  });

  it("calls onOpen on double click", () => {
    render(<FileItem {...defaultProps} />);
    fireEvent.doubleClick(screen.getByText("document.pdf"));
    expect(defaultProps.onOpen).toHaveBeenCalledWith(mockFile);
  });

  it("calls onContextMenu on right click", () => {
    render(<FileItem {...defaultProps} />);
    fireEvent.contextMenu(screen.getByText("document.pdf"));
    expect(defaultProps.onContextMenu).toHaveBeenCalled();
  });
});
