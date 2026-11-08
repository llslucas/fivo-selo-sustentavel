// Detalhe e correção de campanha (vitrine-e-selo T36, VIT-11 AC1–AC6).
// Os serviços de campanhas e de arquivos são mockados; o catálogo de
// beneficiadas vem do fetch simulado.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import { ApiError } from "@/services/api";
import type {
  CampanhaDetalhe,
  CampanhaResumo,
  EdicaoCampanha,
  StatusCampanha,
} from "@/services/campanhas";
import type { Beneficiada } from "@/services/instituicoes";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

const detalharCampanha = vi.fn();
const editarCampanha = vi.fn();
const enviarCapa = vi.fn();
const submeterCampanha = vi.fn();
const baixarSelo = vi.fn();
const listarCampanhas = vi.fn();
const baixarArquivo = vi.fn();

vi.mock("@/services/campanhas", async () => {
  const real = await vi.importActual<typeof import("@/services/campanhas")>(
    "@/services/campanhas",
  );
  return {
    ...real,
    detalharCampanha: (id: string) => detalharCampanha(id),
    editarCampanha: (id: string, dados: EdicaoCampanha) => editarCampanha(id, dados),
    enviarCapa: (id: string, arquivo: File) => enviarCapa(id, arquivo),
    submeterCampanha: (id: string) => submeterCampanha(id),
    baixarSelo: (id: string) => baixarSelo(id),
    listarCampanhas: () => listarCampanhas(),
  };
});

vi.mock("@/services/arquivos", () => ({
  baixarArquivo: (id: string) => baixarArquivo(id),
}));

import DetalheCampanha from "@/components/campanhas/DetalheCampanha";

const CATALOGO: Beneficiada[] = [
  {
    tipo: "INSTITUICAO",
    id: "inst-1",
    nome: "Casa do Bem",
    causa: "Educação",
    cidade: "São Paulo",
    uf: "SP",
    descricao: "Apoio a crianças.",
    site: null,
    logoArquivoId: null,
  },
];

function campanha(status: StatusCampanha, extra: Partial<CampanhaDetalhe> = {}): CampanhaDetalhe {
  return {
    id: "camp-1",
    idPublico: "pub-1",
    nome: "Água Limpa",
    descricao: "Cada pacote vendido ajuda o instituto.",
    capaArquivoId: "arq-capa",
    beneficiada: { tipo: "INSTITUICAO", id: "inst-1" },
    regraDoacao: { tipo: "POR_UNIDADE", valor: "1.50" },
    meta: "5000.00",
    vigencia: { inicio: "2026-11-01", fim: "2027-01-31" },
    status,
    submetidaEm: null,
    motivoUltimaRejeicao: null,
    alteracaoPendente: null,
    criadaEm: "2026-10-28T12:00:00.000Z",
    atualizadaEm: null,
    ...extra,
  };
}

const URL_PUBLICA = "https://fivo.example/empresa/cafe-serra-verde/agua-limpa";

const RESUMO_APROVADA: CampanhaResumo = {
  id: "camp-1",
  nome: "Água Limpa",
  status: "APROVADA",
  regraDoacao: { tipo: "POR_UNIDADE", valor: "1.50" },
  urlPublica: URL_PUBLICA,
};

let mock: MockFetch;
let usuario: ReturnType<typeof userEvent.setup>;
let arquivosBaixados: string[];

beforeEach(() => {
  mock = instalarMockFetch();
  mock.responderPara("/beneficiadas", { status: 200, body: CATALOGO });
  usuario = userEvent.setup({ delay: null });
  for (const fn of [
    detalharCampanha,
    editarCampanha,
    enviarCapa,
    submeterCampanha,
    baixarSelo,
    listarCampanhas,
    baixarArquivo,
  ]) {
    fn.mockReset();
  }
  editarCampanha.mockResolvedValue(campanha("RASCUNHO"));
  enviarCapa.mockResolvedValue(undefined);
  submeterCampanha.mockResolvedValue(undefined);
  listarCampanhas.mockResolvedValue([RESUMO_APROVADA]);
  baixarArquivo.mockResolvedValue(new Blob(["img"], { type: "image/png" }));

  // jsdom não implementa URL.createObjectURL.
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = vi.fn(() => "blob:arquivo");
      static revokeObjectURL = vi.fn();
    },
  );
  arquivosBaixados = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    arquivosBaixados.push(this.download);
  });
});

afterEach(() => {
  // Desmonta antes de desfazer o stub de URL: a limpeza da tela revoga a URL
  // da capa.
  cleanup();
  mock.restaurar();
  vi.restoreAllMocks();
});

function montar() {
  render(
    <ThemeProvider theme={theme}>
      <DetalheCampanha id="camp-1" />
    </ThemeProvider>,
  );
}

async function abrir(detalhe: CampanhaDetalhe) {
  detalharCampanha.mockResolvedValue(detalhe);
  montar();
  await screen.findByRole("heading", { name: "Água Limpa" });
}

function botao(nome: string) {
  return screen.queryByRole("button", { name: nome });
}

describe("Detalhe da campanha — dados (AC1)", () => {
  it("mostra nome, descrição, capa, beneficiada, valor, meta, vigência e status", async () => {
    await abrir(campanha("RASCUNHO"));

    expect(detalharCampanha).toHaveBeenCalledWith("camp-1");
    expect(screen.getByText("Cada pacote vendido ajuda o instituto.")).toBeInTheDocument();
    expect(await screen.findByText("Casa do Bem")).toBeInTheDocument();
    expect(screen.getByText("R$ 1,50 por unidade vendida")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s5\.000,00/)).toBeInTheDocument();
    expect(screen.getByText("01/11/2026 a 31/01/2027")).toBeInTheDocument();
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Capa da campanha" })).toHaveAttribute(
      "src",
      "blob:arquivo",
    );
    expect(baixarArquivo).toHaveBeenCalledWith("arq-capa");
  });

  it('mostra "Regra de doação não definida" quando a regra é nula', async () => {
    await abrir(campanha("RASCUNHO", { regraDoacao: null }));

    expect(screen.getByText("Regra de doação não definida")).toBeInTheDocument();
  });
});

describe("Detalhe da campanha — um bloco por status", () => {
  it("RASCUNHO: oferece edição e envio, sem selo, motivo nem aviso de análise", async () => {
    await abrir(campanha("RASCUNHO"));

    expect(botao("Editar")).toBeInTheDocument();
    expect(botao("Enviar para análise")).toBeInTheDocument();
    expect(botao("Baixar selo")).not.toBeInTheDocument();
    expect(screen.queryByText("Ver página pública")).not.toBeInTheDocument();
    expect(screen.queryByText("Motivo da rejeição")).not.toBeInTheDocument();
    expect(screen.queryByText("Campanha em análise pela Fivo Lab.")).not.toBeInTheDocument();
  });

  it('EM_ANALISE reenviada depois de rejeição: não mostra "Motivo da rejeição"', async () => {
    await abrir(
      campanha("EM_ANALISE", {
        motivoUltimaRejeicao: "A descrição não explica como a doação é feita.",
      }),
    );

    expect(screen.getByText("Campanha em análise pela Fivo Lab.")).toBeInTheDocument();
    expect(screen.queryByText("Motivo da rejeição")).not.toBeInTheDocument();
    expect(
      screen.queryByText("A descrição não explica como a doação é feita."),
    ).not.toBeInTheDocument();
  });

  it('REJEITADA: mostra "Motivo da rejeição" com o texto e oferece edição e envio', async () => {
    await abrir(
      campanha("REJEITADA", {
        motivoUltimaRejeicao: "A descrição não explica como a doação é feita.",
      }),
    );

    expect(screen.getByText("Rejeitada")).toBeInTheDocument();
    expect(screen.getByText("Motivo da rejeição")).toBeInTheDocument();
    expect(
      screen.getByText("A descrição não explica como a doação é feita."),
    ).toBeInTheDocument();
    expect(botao("Editar")).toBeInTheDocument();
    expect(botao("Enviar para análise")).toBeInTheDocument();
    expect(botao("Baixar selo")).not.toBeInTheDocument();
  });

  it('EM_ANALISE: mostra "Campanha em análise pela Fivo Lab." e nenhuma ação', async () => {
    await abrir(campanha("EM_ANALISE"));

    expect(screen.getByText("Em análise")).toBeInTheDocument();
    expect(screen.getByText("Campanha em análise pela Fivo Lab.")).toBeInTheDocument();
    expect(botao("Editar")).not.toBeInTheDocument();
    expect(botao("Enviar para análise")).not.toBeInTheDocument();
    expect(botao("Baixar selo")).not.toBeInTheDocument();
    expect(screen.queryByText("Ver página pública")).not.toBeInTheDocument();
  });

  it('APROVADA: só leitura, com "Baixar selo" e "Ver página pública" na urlPublica', async () => {
    await abrir(campanha("APROVADA"));

    expect(screen.getByText("Aprovada")).toBeInTheDocument();
    expect(botao("Baixar selo")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Ver página pública" })).toHaveAttribute(
      "href",
      URL_PUBLICA,
    );
    expect(botao("Editar")).not.toBeInTheDocument();
    expect(botao("Enviar para análise")).not.toBeInTheDocument();
    expect(screen.queryByText("Campanha em análise pela Fivo Lab.")).not.toBeInTheDocument();
  });
});

describe("Detalhe da campanha — ações", () => {
  it('"Enviar para análise" chama POST /campanhas/{id}/submissao e mostra a campanha em análise', async () => {
    await abrir(campanha("RASCUNHO"));
    detalharCampanha.mockResolvedValue(campanha("EM_ANALISE"));

    await usuario.click(screen.getByRole("button", { name: "Enviar para análise" }));

    expect(await screen.findByText("Campanha em análise pela Fivo Lab.")).toBeInTheDocument();
    expect(submeterCampanha).toHaveBeenCalledWith("camp-1");
    expect(editarCampanha).not.toHaveBeenCalled();
  });

  it('"Salvar alterações" faz PATCH só com o campo alterado', async () => {
    await abrir(campanha("REJEITADA"));
    await usuario.click(screen.getByRole("button", { name: "Editar" }));

    fireEvent.change(screen.getByRole("textbox", { name: /Descrição/i }), {
      target: { value: "Cada pacote vendido doa R$ 1,50 ao instituto." },
    });
    await usuario.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() =>
      expect(editarCampanha).toHaveBeenCalledWith("camp-1", {
        descricao: "Cada pacote vendido doa R$ 1,50 ao instituto.",
      }),
    );
    expect(submeterCampanha).not.toHaveBeenCalled();
  });

  it("a edição abre com os campos da campanha preenchidos", async () => {
    await abrir(campanha("RASCUNHO"));
    await usuario.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByRole("textbox", { name: /Nome da campanha/i })).toHaveValue("Água Limpa");
    expect(screen.getByRole("textbox", { name: /Descrição/i })).toHaveValue(
      "Cada pacote vendido ajuda o instituto.",
    );
    expect(screen.getByLabelText(/Valor doado por unidade/i)).toHaveValue(1.5);
    expect(screen.getByLabelText(/Início/i)).toHaveValue("2026-11-01");
  });

  it('"Enviar para análise" durante a edição salva o que mudou antes de submeter', async () => {
    await abrir(campanha("REJEITADA"));
    await usuario.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Nome da campanha/i }), {
      target: { value: "Água Limpa 2" },
    });
    detalharCampanha.mockResolvedValue(campanha("EM_ANALISE"));

    await usuario.click(screen.getByRole("button", { name: "Enviar para análise" }));

    await waitFor(() => expect(submeterCampanha).toHaveBeenCalledWith("camp-1"));
    expect(editarCampanha).toHaveBeenCalledWith("camp-1", { nome: "Água Limpa 2" });
    expect(editarCampanha.mock.invocationCallOrder[0]).toBeLessThan(
      submeterCampanha.mock.invocationCallOrder[0],
    );
  });

  it("com capa nova, envia PUT /campanhas/{id}/capa depois do PATCH", async () => {
    const capa = new File(["img"], "capa.png", { type: "image/png" });
    await abrir(campanha("RASCUNHO"));
    await usuario.click(screen.getByRole("button", { name: "Editar" }));

    await usuario.upload(screen.getByLabelText("Imagem de capa"), capa);
    await usuario.click(screen.getByRole("button", { name: "Salvar alterações" }));

    await waitFor(() => expect(enviarCapa).toHaveBeenCalledWith("camp-1", capa));
    expect(editarCampanha).not.toHaveBeenCalled();
  });

  it("mostra o texto de mensagemDeErro e mantém os campos quando a API recusa", async () => {
    editarCampanha.mockRejectedValue(new ApiError(422, "Descrição deve ter até 2000 caracteres"));
    await abrir(campanha("RASCUNHO"));
    await usuario.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Descrição/i }), {
      target: { value: "Texto novo" },
    });

    await usuario.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Descrição deve ter até 2000 caracteres",
    );
    expect(screen.getByRole("textbox", { name: /Descrição/i })).toHaveValue("Texto novo");
  });

  it('"Baixar selo" baixa o SVG com o nome devolvido pela API', async () => {
    baixarSelo.mockResolvedValue({
      arquivo: new Blob(["<svg/>"], { type: "image/svg+xml" }),
      nomeArquivo: "selo-agua-limpa.svg",
    });
    await abrir(campanha("APROVADA"));

    await usuario.click(screen.getByRole("button", { name: "Baixar selo" }));

    await waitFor(() => expect(arquivosBaixados).toEqual(["selo-agua-limpa.svg"]));
    expect(baixarSelo).toHaveBeenCalledWith("camp-1");
  });
});

describe("Detalhe da campanha — 404 (AC6)", () => {
  it('mostra "Campanha não encontrada" com link para /campanhas', async () => {
    detalharCampanha.mockRejectedValue(new ApiError(404, "Campanha não encontrada"));
    montar();

    expect(
      await screen.findByRole("heading", { name: "Campanha não encontrada" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /minhas campanhas/i })).toHaveAttribute(
      "href",
      "/campanhas",
    );
  });
});
