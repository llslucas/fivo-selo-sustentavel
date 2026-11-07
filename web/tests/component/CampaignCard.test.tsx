// Cards de campanha na área da empresa (vitrine-e-selo T31, VIT-03 AC5–AC9 e
// VIT-05 AC9). Os serviços de campanhas são mockados; o download é observado
// pelo clique no link temporário.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import { ApiError } from "@/services/api";
import { AuthContext, type AuthContextValue } from "@/contexts/AuthContext";
import type { EmpresaAtual } from "@/services/empresas";
import type { CampanhaResumo, StatusCampanha } from "@/services/campanhas";

const listarCampanhas = vi.fn();
const baixarSelo = vi.fn();

vi.mock("@/services/campanhas", async () => {
  const real = await vi.importActual<typeof import("@/services/campanhas")>(
    "@/services/campanhas",
  );
  return {
    ...real,
    listarCampanhas: () => listarCampanhas(),
    baixarSelo: (id: string) => baixarSelo(id),
  };
});

import { ListaDeCampanhas } from "@/components/dashboard/CampaignCard";
import CampanhasPage from "@/app/(app)/campanhas/page";
import DashboardView from "@/components/dashboard/DashboardView";

const URL_PUBLICA = "https://fivo.example/empresa/cafe-serra-verde/agua-limpa";

function resumo(extra: Partial<CampanhaResumo> = {}): CampanhaResumo {
  return {
    id: "camp-1",
    nome: "Água Limpa",
    status: "RASCUNHO",
    regraDoacao: { tipo: "POR_UNIDADE", valor: "1.50" },
    urlPublica: null,
    ...extra,
  };
}

const APROVADA = resumo({ status: "APROVADA", urlPublica: URL_PUBLICA });

function empresa(extra: Partial<EmpresaAtual> = {}): EmpresaAtual {
  return {
    id: "emp-1",
    razaoSocial: "Café Serra Verde LTDA",
    nomeFantasia: "Café Serra Verde",
    cnpj: "12345678000195",
    email: "contato@cafe.example",
    emailPendente: null,
    telefone: "11999999999",
    cep: "12345678",
    logradouro: "Rua A",
    numero: "1",
    complemento: null,
    bairro: "Centro",
    cidade: "Campinas",
    uf: "SP",
    site: null,
    contato: "Ana",
    status: "APROVADA",
    logoArquivoId: null,
    criadoEm: "2026-10-01T12:00:00.000Z",
    ...extra,
  };
}

function renderizar(ui: React.ReactNode, empresaAtual: EmpresaAtual | null = empresa()) {
  const auth: AuthContextValue = {
    empresa: empresaAtual,
    papel: "EMPRESA",
    estado: "autenticado",
    erro: null,
    verificar: vi.fn(),
    entrar: vi.fn(),
    tentarNovamente: vi.fn(),
    logout: vi.fn(),
  };
  return render(
    <ThemeProvider theme={theme}>
      <AuthContext.Provider value={auth}>{ui}</AuthContext.Provider>
    </ThemeProvider>,
  );
}

async function cards() {
  return screen.findAllByRole("article");
}

function card(nome: string) {
  return screen.getByRole("article", { name: nome });
}

let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;
let downloads: { href: string; download: string }[];

beforeEach(() => {
  listarCampanhas.mockReset();
  baixarSelo.mockReset();

  // jsdom não implementa URL.createObjectURL.
  createObjectURL = vi.fn(() => "blob:selo");
  revokeObjectURL = vi.fn();
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    },
  );
  downloads = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({ href: this.getAttribute("href") ?? "", download: this.download });
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ListaDeCampanhas", () => {
  it("mostra o carregando enquanto a lista não chega", () => {
    listarCampanhas.mockReturnValue(new Promise(() => {}));

    renderizar(<ListaDeCampanhas />);

    expect(screen.getByRole("status", { name: "Carregando" })).toBeInTheDocument();
  });

  it("mostra o erro e tenta de novo", async () => {
    const semConexao = "Não foi possível conectar com o servidor. Verifique sua conexão.";
    listarCampanhas
      .mockRejectedValueOnce(new ApiError(0, semConexao))
      .mockResolvedValueOnce([resumo()]);
    const user = userEvent.setup();

    renderizar(<ListaDeCampanhas />);

    expect(await screen.findByText(semConexao)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("article", { name: "Água Limpa" })).toBeInTheDocument();
    expect(listarCampanhas).toHaveBeenCalledTimes(2);
  });

  it("mostra um card por campanha com nome e o texto do valor", async () => {
    listarCampanhas.mockResolvedValue([
      resumo({ id: "c1", nome: "Água Limpa", regraDoacao: { tipo: "POR_UNIDADE", valor: "1.50" } }),
      resumo({ id: "c2", nome: "Escola Viva", regraDoacao: { tipo: "PERCENTUAL", percentual: "2.50" } }),
      resumo({ id: "c3", nome: "Mata Nativa", regraDoacao: null }),
    ]);

    renderizar(<ListaDeCampanhas />);

    expect(await cards()).toHaveLength(3);
    expect(within(card("Água Limpa")).getByText("R$ 1,50 por unidade vendida")).toBeInTheDocument();
    expect(within(card("Escola Viva")).getByText("2,5% de cada venda")).toBeInTheDocument();
    expect(within(card("Mata Nativa")).getByText("Regra de doação não definida")).toBeInTheDocument();
  });

  it.each<[StatusCampanha, string]>([
    ["RASCUNHO", "Rascunho"],
    ["EM_ANALISE", "Em análise"],
    ["APROVADA", "Aprovada"],
    ["REJEITADA", "Rejeitada"],
  ])("rotula o status %s como \"%s\"", async (status, rotulo) => {
    listarCampanhas.mockResolvedValue([
      resumo({ status, urlPublica: status === "APROVADA" ? URL_PUBLICA : null }),
    ]);

    renderizar(<ListaDeCampanhas />);

    await cards();
    expect(within(card("Água Limpa")).getByText(rotulo)).toBeInTheDocument();
  });

  it("mostra \"Baixar selo\" e \"Ver página pública\" na APROVADA, com href = urlPublica", async () => {
    listarCampanhas.mockResolvedValue([APROVADA]);

    renderizar(<ListaDeCampanhas />);

    await cards();
    const aprovada = card("Água Limpa");
    expect(within(aprovada).getByRole("button", { name: "Baixar selo" })).toBeInTheDocument();
    const paginaPublica = within(aprovada).getByRole("link", { name: "Ver página pública" });
    expect(paginaPublica).toHaveAttribute("href", URL_PUBLICA);
    expect(paginaPublica).toHaveAttribute("target", "_blank");
    expect(paginaPublica).toHaveAttribute("rel", "noopener noreferrer");
  });

  it.each<StatusCampanha>(["RASCUNHO", "EM_ANALISE", "REJEITADA"])(
    "não mostra \"Baixar selo\" nem \"Ver página pública\" em %s",
    async (status) => {
      listarCampanhas.mockResolvedValue([resumo({ status })]);

      renderizar(<ListaDeCampanhas />);

      await cards();
      expect(screen.queryByRole("button", { name: "Baixar selo" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Ver página pública" })).not.toBeInTheDocument();
    },
  );

  it("leva ao detalhe da campanha pelo id", async () => {
    listarCampanhas.mockResolvedValue([resumo({ id: "camp-42" })]);

    renderizar(<ListaDeCampanhas />);

    await cards();
    expect(screen.getByRole("link", { name: "Ver campanha Água Limpa" })).toHaveAttribute(
      "href",
      "/campanhas/camp-42",
    );
  });

  it("baixa o selo com o nome devolvido e libera a URL temporária", async () => {
    const svg = new Blob(["<svg/>"], { type: "image/svg+xml" });
    baixarSelo.mockResolvedValue({ arquivo: svg, nomeArquivo: "selo-agua-limpa.svg" });
    listarCampanhas.mockResolvedValue([APROVADA]);
    const user = userEvent.setup();

    renderizar(<ListaDeCampanhas />);

    await user.click(await screen.findByRole("button", { name: "Baixar selo" }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(baixarSelo).toHaveBeenCalledWith("camp-1");
    expect(createObjectURL).toHaveBeenCalledWith(svg);
    expect(downloads[0]).toEqual({ href: "blob:selo", download: "selo-agua-limpa.svg" });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:selo");
  });

  it("mostra o erro quando o selo não pode ser baixado", async () => {
    baixarSelo.mockRejectedValue(new ApiError(409, "Campanha não está aprovada"));
    listarCampanhas.mockResolvedValue([APROVADA]);
    const user = userEvent.setup();

    renderizar(<ListaDeCampanhas />);

    await user.click(await screen.findByRole("button", { name: "Baixar selo" }));

    expect(
      await within(card("Água Limpa")).findByText("Campanha não está aprovada"),
    ).toBeInTheDocument();
    expect(downloads).toHaveLength(0);
  });

  it("sem campanhas, mostra a mensagem e o botão \"Criar campanha\"", async () => {
    listarCampanhas.mockResolvedValue([]);

    renderizar(<ListaDeCampanhas />);

    expect(await screen.findByText("Você ainda não tem campanhas.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar campanha" })).toHaveAttribute(
      "href",
      "/campanhas/nova",
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("não mostra valor doado nem QR gerado · comprovante", async () => {
    listarCampanhas.mockResolvedValue([APROVADA, resumo({ id: "c2", nome: "Escola Viva" })]);

    renderizar(<ListaDeCampanhas />);

    await cards();
    expect(screen.queryByText(/doados/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/QR gerado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/comprovante/i)).not.toBeInTheDocument();
  });
});

describe("Página /campanhas", () => {
  it("mostra todas as campanhas da API", async () => {
    listarCampanhas.mockResolvedValue([
      resumo({ id: "c1", nome: "Um" }),
      resumo({ id: "c2", nome: "Dois" }),
      resumo({ id: "c3", nome: "Três" }),
      resumo({ id: "c4", nome: "Quatro" }),
    ]);

    renderizar(<CampanhasPage />);

    expect((await cards()).map((c) => c.getAttribute("aria-label"))).toEqual([
      "Um",
      "Dois",
      "Três",
      "Quatro",
    ]);
  });

  it("sem campanhas, mostra o estado vazio", async () => {
    listarCampanhas.mockResolvedValue([]);

    renderizar(<CampanhasPage />);

    expect(await screen.findByText("Você ainda não tem campanhas.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar campanha" })).toBeInTheDocument();
  });
});

describe("Dashboard", () => {
  it("mostra só as 3 campanhas mais recentes da API", async () => {
    listarCampanhas.mockResolvedValue([
      resumo({ id: "c1", nome: "Um" }),
      resumo({ id: "c2", nome: "Dois" }),
      resumo({ id: "c3", nome: "Três" }),
      resumo({ id: "c4", nome: "Quatro" }),
    ]);

    renderizar(<DashboardView />);

    expect((await cards()).map((c) => c.getAttribute("aria-label"))).toEqual([
      "Um",
      "Dois",
      "Três",
    ]);
  });

  it("sem campanhas, mostra o estado vazio", async () => {
    listarCampanhas.mockResolvedValue([]);

    renderizar(<DashboardView />);

    expect(await screen.findByText("Você ainda não tem campanhas.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Criar campanha" })).toBeInTheDocument();
  });

  it("cumprimenta a empresa pelo nome fantasia", async () => {
    listarCampanhas.mockResolvedValue([]);

    renderizar(<DashboardView />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Olá, Café Serra Verde" }),
    ).toBeInTheDocument();
    await screen.findByText("Você ainda não tem campanhas.");
  });

  it("usa a razão social quando não há nome fantasia", async () => {
    listarCampanhas.mockResolvedValue([]);

    renderizar(<DashboardView />, empresa({ nomeFantasia: "" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Olá, Café Serra Verde LTDA" }),
    ).toBeInTheDocument();
    await screen.findByText("Você ainda não tem campanhas.");
  });

  it("não mostra números fictícios nem aviso de comprovante", async () => {
    listarCampanhas.mockResolvedValue([APROVADA]);

    renderizar(<DashboardView />);

    await cards();
    expect(screen.queryByText(/comprovante/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Campanhas ativas")).not.toBeInTheDocument();
    expect(screen.queryByText("Selos gerados")).not.toBeInTheDocument();
    expect(screen.queryByText("Acessos à página pública")).not.toBeInTheDocument();
  });
});
