// Menu da área da empresa sem selos e comprovantes (vitrine-e-selo T38,
// VIT-11 AC7).

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    empresa: { nomeFantasia: "Café Serra Verde" },
    logout: vi.fn(() => Promise.resolve()),
  }),
}));

import AppHeader from "@/components/layout/AppHeader";

function montar() {
  render(
    <ThemeProvider theme={theme}>
      <AppHeader />
    </ThemeProvider>,
  );
}

function menus() {
  return screen.getAllByRole("navigation", { name: "Navegação principal" });
}

describe("Menu da empresa", () => {
  it('tem "Dashboard" e "Campanhas" e não tem "Selos" nem "Comprovantes"', () => {
    montar();
    const menu = within(menus()[0]);

    expect(menu.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(menu.getByRole("link", { name: "Campanhas" })).toHaveAttribute("href", "/campanhas");
    expect(menu.queryByRole("link", { name: "Selos" })).not.toBeInTheDocument();
    expect(menu.queryByRole("link", { name: "Comprovantes" })).not.toBeInTheDocument();
  });

  it('o menu do celular também não tem "Selos" nem "Comprovantes"', async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "abrir menu de navegação" }));

    const menuCelular = within(menus().at(-1)!);
    expect(menuCelular.getByRole("link", { name: "Campanhas" })).toBeInTheDocument();
    expect(menuCelular.queryByRole("link", { name: "Selos" })).not.toBeInTheDocument();
    expect(menuCelular.queryByRole("link", { name: "Comprovantes" })).not.toBeInTheDocument();
  });

  it("nenhum link aponta para /selos ou /comprovantes", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: "abrir menu de navegação" }));

    const destinos = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(destinos).not.toContain("/selos");
    expect(destinos).not.toContain("/comprovantes");
  });
});
