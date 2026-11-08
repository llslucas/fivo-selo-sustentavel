import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Suspense } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import PaginaEmpresaPublica from "@/components/empresa/PaginaEmpresaPublica";
import EmpresaCampanhaPage from "@/app/empresa/[slug]/[slugCampanha]/page";
import type { EmpresaPublica } from "@/services/empresasPublicas";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

const empresa: EmpresaPublica = {
  slug: "cafe-serra-verde",
  nomeFantasia: "Café Serra Verde",
  cidade: "Campinas",
  uf: "SP",
  site: "https://cafeserraverde.com.br",
  temLogo: false,
  campanhas: [
    {
      slug: "agua-limpa",
      nome: "Água Limpa",
      descricao: "texto",
      beneficiada: { tipo: "INSTITUICAO", nome: "Instituto X" },
      regraDoacao: { tipo: "POR_UNIDADE", valor: "1.00" },
      vigencia: { inicio: "2026-11-01" },
      situacao: "EM_ANDAMENTO",
    },
    {
      slug: "mata-viva",
      nome: "Mata Viva",
      descricao: "texto",
      beneficiada: { tipo: "INSTITUICAO", nome: "Instituto Y" },
      regraDoacao: { tipo: "POR_UNIDADE", valor: "2.00" },
      vigencia: { inicio: "2026-11-01" },
      situacao: "EM_ANDAMENTO",
    },
  ],
};

function montar(slugCampanha: string) {
  return render(
    <ThemeProvider theme={theme}>
      <PaginaEmpresaPublica slug="cafe-serra-verde" slugCampanha={slugCampanha} />
    </ThemeProvider>,
  );
}

describe("PaginaEmpresaPublica — rolagem da rota do QR (T34)", () => {
  let mock: MockFetch;
  let scrollSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mock = instalarMockFetch();
    mock.responderPara("/empresas/publicas/cafe-serra-verde", { status: 200, body: empresa });
    scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
  });

  afterEach(() => {
    mock.restaurar();
    vi.restoreAllMocks();
  });

  it("rola até o subtópico da campanha do slug, não até a primeira", async () => {
    montar("mata-viva");
    expect(await screen.findByText("Mata Viva")).toBeInTheDocument();

    await waitFor(() => expect(scrollSpy).toHaveBeenCalledTimes(1));
    const alvo = scrollSpy.mock.contexts[0] as HTMLElement;
    expect(alvo.id).toBe("mata-viva");
    expect(alvo).toBe(document.getElementById("mata-viva"));
  });

  it("a rota /empresa/{slug}/{slugCampanha} repassa os dois slugs à página", async () => {
    const params = Promise.resolve({ slug: "cafe-serra-verde", slugCampanha: "mata-viva" });

    await act(async () => {
      render(
        <ThemeProvider theme={theme}>
          <Suspense fallback={null}>
            <EmpresaCampanhaPage params={params} />
          </Suspense>
        </ThemeProvider>,
      );
    });

    expect(await screen.findByText("Mata Viva")).toBeInTheDocument();
    await waitFor(() => expect(scrollSpy).toHaveBeenCalledTimes(1));
    expect((scrollSpy.mock.contexts[0] as HTMLElement).id).toBe("mata-viva");
  });

  it("não quebra e não rola quando o slug da campanha não existe", async () => {
    montar("nao-existe");

    expect(await screen.findByText("Água Limpa")).toBeInTheDocument();
    expect(screen.getByText("Mata Viva")).toBeInTheDocument();
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
