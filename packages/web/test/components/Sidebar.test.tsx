import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "../../src/components/Sidebar";

describe("Sidebar", () => {
  const defaultProps = {
    currentView: "files" as const,
    onViewChange: vi.fn(),
    onLogout: vi.fn(),
  };

  it("renders all navigation items", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("All Files")).toBeInTheDocument();
    expect(screen.getByText("Trash")).toBeInTheDocument();
    expect(screen.getByText("Shared Links")).toBeInTheDocument();
  });

  it("highlights the current view", () => {
    render(<Sidebar {...defaultProps} currentView="trash" />);
    const trashBtn = screen.getByText("Trash").closest("button")!;
    expect(trashBtn.className).toContain("bg-brand-50");
  });

  it("calls onViewChange when nav item clicked", () => {
    render(<Sidebar {...defaultProps} />);
    fireEvent.click(screen.getByText("Trash"));
    expect(defaultProps.onViewChange).toHaveBeenCalledWith("trash");
  });

  it("calls onLogout when logout clicked", () => {
    render(<Sidebar {...defaultProps} />);
    fireEvent.click(screen.getByText("Logout"));
    expect(defaultProps.onLogout).toHaveBeenCalled();
  });
});
