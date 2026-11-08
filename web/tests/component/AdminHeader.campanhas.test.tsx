// Item "Campanhas" no menu do admin (vitrine-e-selo T44, VIT-12 AC8).

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";

let pathnameAtual = "/admin";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => pathnameAtual,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ logout: vi.fn(() => Promise.resolve()) }),
}));

import AdminHeader from "@/components/layout/AdminHeader";

function menu() {
  render(
    <ThemeProvider theme={theme}>
      <AdminHeader />
    </ThemeProvider>,
  );
  return within(screen.getByRole("navigation", { name: "Navegação do admin" }));
}

describe("Menu do admin", () => {
  it('tem o item "Campanhas" levando a /admin/campanhas', () => {
    const link = menu().getByRole("link", { name: "Campanhas" });

    expect(link).toHaveAttribute("href", "/admin/campanhas");
  });

  it('marca "Campanhas" como página atual dentro de /admin/campanhas', () => {
    pathnameAtual = "/admin/campanhas";

    const link = menu().getByRole("link", { name: "Campanhas" });

    expect(link).toHaveAttribute("aria-current", "page");
  });
});
