// Testes da página /parceiros (vitrine-e-selo T39, VIT-09 AC3–AC5).
// O serviço é mockado; os erros usam ApiError real.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import { ApiError } from "@/services/api";
import { type ParceiroResumo } from "@/services/empresasPublicas";
import { definirViewport } from "../helpers/viewport";

const listarParceiros = vi.fn();

vi.mock("@/services/empresasPublicas", async () => {
  const real = await vi.importActual<typeof import("@/services/empresasPublicas")>(
    "@/services/empresasPublicas",
  );
  return { ...real, listarParceiros: () => listarParceiros() };
});

vi.mock("@/components/layout/PublicSimpleHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));

import ParceirosPage from "@/app/parceiros/page";

const cafe: ParceiroResumo = {
  slug: "cafe-serra-verde",
  nomeFantasia: "Café Serra Verde",
  cidade: "Campinas",
  uf: "SP",
  temLogo: true,
};
const padaria: ParceiroResumo = {
  slug: "padaria-sol",
  nomeFantasia: "Padaria Sol",
  cidade: "Curitiba",
  uf: "PR",
  temLogo: false,
};

function montar() {
  return render(
    <ThemeProvider theme={theme}>
      <ParceirosPage />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  listarParceiros.mockReset();
});

describe("/parceiros", () => {
  it("mostra um card por empresa com nome e cidade/UF, na ordem recebida", async () => {
    listarParceiros.mockResolvedValue([cafe, padaria]);
    montar();

    expect(await screen.findByText("Café Serra Verde")).toBeInTheDocument();
    expect(screen.getByText("Campinas/SP")).toBeInTheDocument();
    expect(screen.getByText("Padaria Sol")).toBeInTheDocument();
    expect(screen.getByText("Curitiba/PR")).toBeInTheDocument();

    const nomes = screen.getAllByRole("link").map((a) => a.getAttribute("aria-label"));
    expect(nomes).toEqual(["Ver perfil de Café Serra Verde", "Ver perfil de Padaria Sol"]);
  });

  it("leva cada card a /empresa/{slug}", async () => {
    listarParceiros.mockResolvedValue([cafe, padaria]);
    montar();

    const link = await screen.findByRole("link", { name: "Ver perfil de Café Serra Verde" });
    expect(link).toHaveAttribute("href", "/empresa/cafe-serra-verde");
    expect(screen.getByRole("link", { name: "Ver perfil de Padaria Sol" })).toHaveAttribute(
      "href",
      "/empresa/padaria-sol",
    );
  });

  it("usa o logo da API quando temLogo e as iniciais quando não tem", async () => {
    listarParceiros.mockResolvedValue([cafe, padaria]);
    montar();

    const img = await screen.findByRole("img", { name: "Logo de Café Serra Verde" });
    expect(img).toHaveAttribute("src", "/api/empresas/publicas/cafe-serra-verde/logo");
    expect(screen.queryByRole("img", { name: "Logo de Padaria Sol" })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("iniciais-logo").map((e) => e.textContent)).toEqual(["PS"]);
  });

  it("troca o logo pelas iniciais quando a imagem não carrega", async () => {
    listarParceiros.mockResolvedValue([cafe]);
    montar();

    const img = await screen.findByRole("img", { name: "Logo de Café Serra Verde" });
    act(() => {
      img.dispatchEvent(new Event("error"));
    });

    await waitFor(() => expect(screen.getByTestId("iniciais-logo")).toHaveTextContent("CS"));
    expect(screen.queryByRole("img", { name: /Logo de/ })).not.toBeInTheDocument();
  });

  it("lista vazia mostra a mensagem literal e o link para /cadastro", async () => {
    listarParceiros.mockResolvedValue([]);
    montar();

    expect(await screen.findByText("Nenhuma empresa parceira ainda.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cadastr/i })).toHaveAttribute("href", "/cadastro");
  });

  it("erro da API mostra a mensagem de mensagemDeErro e nenhum card", async () => {
    listarParceiros.mockRejectedValue(new ApiError(500, "Internal server error"));
    montar();

    expect(
      await screen.findByText("O servidor está indisponível no momento. Tente novamente em instantes."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma empresa parceira ainda.")).not.toBeInTheDocument();
  });

  it("busca filtra por nome, cidade e UF sem diferenciar caixa nem acento", async () => {
    const user = userEvent.setup();
    listarParceiros.mockResolvedValue([cafe, padaria]);
    montar();
    await screen.findByText("Café Serra Verde");
    const busca = screen.getByRole("textbox", { name: "Buscar empresa" });

    await user.type(busca, "CAFE");
    expect(screen.getByText("Café Serra Verde")).toBeInTheDocument();
    expect(screen.queryByText("Padaria Sol")).not.toBeInTheDocument();

    await user.clear(busca);
    await user.type(busca, "curitiba");
    expect(screen.queryByText("Café Serra Verde")).not.toBeInTheDocument();
    expect(screen.getByText("Padaria Sol")).toBeInTheDocument();

    await user.clear(busca);
    await user.type(busca, "sp");
    expect(screen.getByText("Café Serra Verde")).toBeInTheDocument();
    expect(screen.queryByText("Padaria Sol")).not.toBeInTheDocument();
  });

  it("contador mostra o total real de empresas", async () => {
    listarParceiros.mockResolvedValue([cafe, padaria]);
    montar();

    expect(await screen.findByText("2 empresas cadastradas")).toBeInTheDocument();
    expect(screen.queryByText(/312/)).not.toBeInTheDocument();
  });

  it("em 320 px renderiza os cards sem largura fixa que force rolagem horizontal", async () => {
    definirViewport(320);
    listarParceiros.mockResolvedValue([cafe, padaria]);
    const { container } = montar();
    await screen.findByText("Café Serra Verde");

    const comLarguraFixa = Array.from(container.querySelectorAll<HTMLElement>("[style]")).filter(
      (el) => /(^|;)\s*(min-)?width:\s*\d{3,}px/.test(el.getAttribute("style") ?? ""),
    );
    expect(comLarguraFixa).toHaveLength(0);
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});