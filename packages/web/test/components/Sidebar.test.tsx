import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Sidebar } from "../../src/components/Sidebar";

function renderSidebar(path = "/") {
  const onLogout = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Sidebar onLogout={onLogout} />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { onLogout };
}

describe("Sidebar", () => {
  it("renders all navigation items", () => {
    renderSidebar();
    expect(screen.getByText("All Files")).toBeInTheDocument();
    expect(screen.getByText("Trash")).toBeInTheDocument();
    expect(screen.getByText("Shared Links")).toBeInTheDocument();
    expect(screen.getByText("WebDAV")).toBeInTheDocument();
  });

  it("highlights the current path", () => {
    renderSidebar("/trash");
    const trashBtn = screen.getByText("Trash").closest("button")!;
    expect(trashBtn.className).toContain("bg-brand-50");
  });

  it("does not highlight inactive items", () => {
    renderSidebar("/");
    const trashBtn = screen.getByText("Trash").closest("button")!;
    expect(trashBtn.className).not.toContain("bg-brand-50");
  });

  it("calls onLogout when logout clicked", () => {
    const { onLogout } = renderSidebar();
    fireEvent.click(screen.getByText("Logout"));
    expect(onLogout).toHaveBeenCalled();
  });
});
