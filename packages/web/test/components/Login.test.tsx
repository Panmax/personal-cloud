import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Login } from "../../src/pages/Login";

const mockPost = vi.fn();

vi.mock("../../src/api/client", () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
  BASE: "",
}));

vi.mock("../../src/stores/app", () => ({
  useAppStore: (selector: (s: { setAuthenticated: () => void }) => unknown) =>
    selector({ setAuthenticated: vi.fn() }),
}));

const renderLogin = () =>
  render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );

describe("Login", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it("renders login form", () => {
    renderLogin();
    expect(screen.getByText("Personal Cloud")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("shows error on failed login", async () => {
    mockPost.mockRejectedValue(new Error("Invalid password"));
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByText("Login"));
    await waitFor(() => {
      expect(screen.getByText("Invalid password")).toBeInTheDocument();
    });
  });

  it("calls api.post with password on submit", async () => {
    mockPost.mockResolvedValue({ token: "test-token" });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "mypass" } });
    fireEvent.click(screen.getByText("Login"));
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/api/auth/login", { password: "mypass" });
    });
  });
});
