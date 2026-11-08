// Nova campanha ligada à API (vitrine-e-selo T41, VIT-10 AC1–AC6).
// O serviço de campanhas é mockado; o catálogo de beneficiadas vem do fetch
// simulado.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import { ApiError } from "@/services/api";
import type { NovaCampanha } from "@/services/campanhas";
import type { Beneficiada } from "@/services/instituicoes";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

const push = vi.fn();
const criarCampanha = vi.fn();
const enviarCapa = vi.fn();
const submeterCampanha = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock("@/services/campanhas", async () => {
  const real = await vi.importActual<typeof import("@/services/campanhas")>(
    "@/services/campanhas",
  );
  return {
    ...real,
    criarCampanha: (dados: NovaCampanha) => criarCampanha(dados),
    enviarCapa: (id: string, arquivo: File) => enviarCapa(id, arquivo),
    submeterCampanha: (id: string) => submeterCampanha(id),
  };
});

import CampaignWizardNew from "@/components/campaign-wizard/CampaignWizardNew";

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
  {
    tipo: "CAUSA",
    id: "causa-1",
    nome: "Mata em Pé",
    causa: "Meio ambiente",
    cidade: null,
    uf: null,
    descricao: "Reflorestamento.",
    site: null,
    logoArquivoId: null,
  },
];

let mock: MockFetch;
let usuario: ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  mock = instalarMockFetch();
  mock.responderPara("/beneficiadas", { status: 200, body: CATALOGO });
  usuario = userEvent.setup({ delay: null });
  for (const fn of [push, criarCampanha, enviarCapa, submeterCampanha]) fn.mockReset();
  criarCampanha.mockResolvedValue({ id: "camp-1", idPublico: "pub-1" });
  enviarCapa.mockResolvedValue(undefined);
  submeterCampanha.mockResolvedValue(undefined);
});

afterEach(() => {
  mock.restaurar();
});

function montar() {
  render(
    <ThemeProvider theme={theme}>
      <CampaignWizardNew />
    </ThemeProvider>,
  );
}

function campo(nome: RegExp) {
  return screen.getByRole("textbox", { name: nome });
}

async function preencherPasso1(beneficiadaId = "inst-1") {
  fireEvent.change(campo(/Nome da campanha/i), { target: { value: "Água Limpa" } });
  fireEvent.change(campo(/Descrição/i), { target: { value: "Cada pacote ajuda." } });
  await usuario.click(await screen.findByTestId(`beneficiada-item-${beneficiadaId}`));
}

async function preencherPasso2({ capa }: { capa?: File } = {}) {
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
  fireEvent.change(screen.getByLabelText(/Valor doado por unidade/i), {
    target: { value: "1.5" },
  });
  fireEvent.change(screen.getByLabelText(/Meta de arrecadação/i), {
    target: { value: "5000" },
  });
  fireEvent.change(screen.getByLabelText(/Início/i), { target: { value: "2026-11-01" } });
  fireEvent.change(screen.getByLabelText(/Fim/i), { target: { value: "2027-01-31" } });
  if (capa) await usuario.upload(screen.getByLabelText("Imagem de capa"), capa);
}

describe("Nova campanha", () => {
  it('"Salvar rascunho" faz POST /campanhas com os campos preenchidos e abre o detalhe', async () => {
    montar();
    await preencherPasso1();
    await preencherPasso2();

    await usuario.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/campanhas/camp-1"));
    expect(criarCampanha).toHaveBeenCalledTimes(1);
    expect(criarCampanha).toHaveBeenCalledWith({
      nome: "Água Limpa",
      descricao: "Cada pacote ajuda.",
      instituicaoId: "inst-1",
      regraDoacao: { tipo: "POR_UNIDADE", valor: "1.5" },
      meta: "5000",
      vigencia: { inicio: "2026-11-01", fim: "2027-01-31" },
    });
    expect(enviarCapa).not.toHaveBeenCalled();
    expect(submeterCampanha).not.toHaveBeenCalled();
  });

  it("salva o rascunho só com o nome", async () => {
    montar();
    fireEvent.change(campo(/Nome da campanha/i), { target: { value: "Rascunho" } });

    await usuario.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/campanhas/camp-1"));
    expect(criarCampanha).toHaveBeenCalledWith({ nome: "Rascunho" });
  });

  it("manda a causa escolhida em causaId", async () => {
    montar();
    await preencherPasso1("causa-1");

    await usuario.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    await waitFor(() => expect(criarCampanha).toHaveBeenCalled());
    const dados = criarCampanha.mock.calls[0][0] as NovaCampanha;
    expect(dados.causaId).toBe("causa-1");
    expect(dados).not.toHaveProperty("instituicaoId");
  });

  it("com capa, envia PUT /campanhas/{id}/capa depois da criação", async () => {
    const capa = new File(["img"], "capa.png", { type: "image/png" });
    montar();
    await preencherPasso1();
    await preencherPasso2({ capa });

    await usuario.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    await waitFor(() => expect(enviarCapa).toHaveBeenCalledWith("camp-1", capa));
    expect(criarCampanha.mock.invocationCallOrder[0]).toBeLessThan(
      enviarCapa.mock.invocationCallOrder[0],
    );
  });

  it('"Enviar para análise" cria, submete e mostra "Campanha enviada para análise."', async () => {
    montar();
    await preencherPasso1();
    await preencherPasso2();
    await usuario.click(screen.getByRole("button", { name: "Continuar" }));

    await usuario.click(screen.getByRole("button", { name: "Enviar para análise" }));

    expect(await screen.findByText("Campanha enviada para análise.")).toBeInTheDocument();
    expect(criarCampanha).toHaveBeenCalledTimes(1);
    expect(submeterCampanha).toHaveBeenCalledWith("camp-1");
    expect(criarCampanha.mock.invocationCallOrder[0]).toBeLessThan(
      submeterCampanha.mock.invocationCallOrder[0],
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("mostra o texto de mensagemDeErro e mantém os campos quando a API recusa", async () => {
    criarCampanha.mockRejectedValue(new ApiError(422, "Instituição ou causa indisponível"));
    montar();
    await preencherPasso1();

    await usuario.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Instituição ou causa indisponível",
    );
    expect(campo(/Nome da campanha/i)).toHaveValue("Água Limpa");
    expect(campo(/Descrição/i)).toHaveValue("Cada pacote ajuda.");
    expect(screen.getByTestId("beneficiada-item-inst-1")).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("depois de criar, uma falha na submissão não cria a campanha de novo ao tentar outra vez", async () => {
    submeterCampanha
      .mockRejectedValueOnce(new ApiError(0, "Não foi possível conectar com o servidor."))
      .mockResolvedValueOnce(undefined);
    montar();
    await preencherPasso1();
    await preencherPasso2();
    await usuario.click(screen.getByRole("button", { name: "Continuar" }));

    await usuario.click(screen.getByRole("button", { name: "Enviar para análise" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível conectar com o servidor.",
    );
    await usuario.click(screen.getByRole("button", { name: "Enviar para análise" }));

    expect(await screen.findByText("Campanha enviada para análise.")).toBeInTheDocument();
    expect(criarCampanha).toHaveBeenCalledTimes(1);
    expect(submeterCampanha).toHaveBeenCalledTimes(2);
  });

  it("não tem passo de escolha de modelo de selo", async () => {
    montar();
    await preencherPasso1();
    expect(screen.queryByText(/modelo de selo/i)).not.toBeInTheDocument();

    await preencherPasso2();
    expect(screen.queryByText(/modelo de selo/i)).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByRole("heading", { name: "Revise e envie" })).toBeInTheDocument();
    expect(screen.queryByText(/modelo de selo/i)).not.toBeInTheDocument();
    expect(screen.getByText("Etapa 3 de 3")).toBeInTheDocument();
  });
});
