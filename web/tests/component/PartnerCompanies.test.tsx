// Testes da seção de parceiros da home (vitrine-e-selo T40, VIT-09).
// O serviço é mockado; os erros usam ApiError real.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import { ApiError } from "@/services/api";
import { type ParceiroResumo } from "@/services/empresasPublicas";

const listarParceiros = vi.fn();

vi.mock("@/services/empresasPublicas", async () => {
  const real = await vi.importActual<typeof import("@/services/empresasPublicas")>(
    "@/services/empresasPublicas",
  );
  return { ...real, listarParceiros: () => listarParceiros() };
});

import PartnerCompanies from "@/components/home/PartnerCompanies";

function empresa(n: number, extra: Partial<ParceiroResumo> = {}): ParceiroResumo {
  return {
    slug: `empresa-${n}`,
    nomeFantasia: `Empresa ${n}`,
    cidade: "Campinas",
    uf: "SP",
    temLogo: false,
    ...extra,
  };
}

function montar() {
  return render(
    <ThemeProvider theme={theme}>
      <PartnerCompanies />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  listarParceiros.mockReset();
});

describe("PartnerCompanies (home)", () => {
  it("mostra só as 3 primeiras empresas da lista, na ordem recebida", async () => {
    listarParceiros.mockResolvedValue([1, 2, 3, 4, 5].map((n) => empresa(n)));
    montar();

    expect(await screen.findByText("Empresa 1")).toBeInTheDocument();
    const nomes = screen.getAllByText(/^Empresa \d$/).map((e) => e.textContent);
    expect(nomes).toEqual(["Empresa 1", "Empresa 2", "Empresa 3"]);
  });

  it("cada card mostra cidade/UF e leva a /empresa/{slug}", async () => {
    listarParceiros.mockResolvedValue([empresa(1, { slug: "cafe-serra-verde", nomeFantasia: "Café Serra Verde" })]);
    montar();

    const link = (await screen.findByText("Café Serra Verde")).closest("a");
    expect(link).toHaveAttribute("href", "/empresa/cafe-serra-verde");
    expect(screen.getByText("Campinas/SP")).toBeInTheDocument();
  });

  it("usa o logo da API quando temLogo e as iniciais quando não tem", async () => {
    listarParceiros.mockResolvedValue([empresa(1, { temLogo: true }), empresa(2)]);
    montar();

    const img = await screen.findByRole("img", { name: "Logo de Empresa 1" });
    expect(img).toHaveAttribute("src", "/api/empresas/publicas/empresa-1/logo");
    expect(screen.getAllByTestId("iniciais-logo").map((e) => e.textContent)).toEqual(["E2"]);
  });

  it("troca o logo pelas iniciais quando a imagem não carrega", async () => {
    listarParceiros.mockResolvedValue([empresa(1, { temLogo: true })]);
    montar();

    const img = await screen.findByRole("img", { name: "Logo de Empresa 1" });
    act(() => {
      img.dispatchEvent(new Event("error"));
    });

    await waitFor(() => expect(screen.getByTestId("iniciais-logo")).toHaveTextContent("E1"));
  });

  it("sem empresas mostra a mensagem literal e o link para /cadastro", async () => {
    listarParceiros.mockResolvedValue([]);
    montar();

    expect(await screen.findByText("Nenhuma empresa parceira ainda.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cadastr/i })).toHaveAttribute("href", "/cadastro");
  });

  it("erro da API mostra a mensagem de mensagemDeErro", async () => {
    listarParceiros.mockRejectedValue(new ApiError(500, "Internal server error"));
    montar();

    expect(
      await screen.findByText("O servidor está indisponível no momento. Tente novamente em instantes."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma empresa parceira ainda.")).not.toBeInTheDocument();
  });

  it("mantém o título, o subtítulo atual e o link 'Ver todas' para /parceiros", async () => {
    listarParceiros.mockResolvedValue([empresa(1)]);
    montar();
    await screen.findByText("Empresa 1");

    expect(screen.getByRole("heading", { name: "Empresas que já participam" })).toBeInTheDocument();
    expect(screen.getByText("Veja campanhas em andamento e o que já foi doado.")).toBeInTheDocument();
    expect(screen.getByText("Ver todas").closest("a")).toHaveAttribute("href", "/parceiros");
  });
});