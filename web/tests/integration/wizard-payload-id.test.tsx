// Teste de integração do payload do wizard de campanha (web/) — Task 9.3,
// ligado à API na vitrine-e-selo T41.
//
// Feature: catalogo-instituicoes-wizard, Property 12: Preservação do
// identificador no payload.
// Validates: Requirements 6.1, 6.3
//
// Propriedade: para qualquer beneficiada selecionada pela empresa no catálogo
// real, o corpo de POST /campanhas (Payload_Criacao_Campanha) leva exatamente o
// `id` escolhido — em `instituicaoId` para instituição e em `causaId` para
// causa — tanto ao salvar o rascunho quanto ao enviar para análise.
//
// Estratégia: exercita o componente real `CampaignWizardNew`. A seleção é feita
// clicando no item real renderizado pelo `SeletorBeneficiada`, de modo que o id
// percorre onSelecionar → onChange → estado do wizard → corpo do POST. O
// catálogo e as rotas de campanha vêm do fetch mockado (Mock_API), nunca de
// rede real.

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import fc from "fast-check";

import theme from "@/theme";
import type { Beneficiada } from "@/services/instituicoes";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

import CampaignWizardNew from "@/components/campaign-wizard/CampaignWizardNew";

afterEach(() => {
  cleanup();
});

// Catálogo fixo retornado por GET /beneficiadas (catálogo completo e qualquer
// termo de busca). Os ids são conhecidos e usados como espaço de geração da
// seleção.
const CATALOGO: Beneficiada[] = [
  {
    tipo: "INSTITUICAO",
    id: "benef-verde",
    nome: "Instituto Verde",
    causa: "Meio ambiente",
    cidade: "São Paulo",
    uf: "SP",
    descricao: "Reflorestamento urbano",
    site: "https://instituto-verde.org",
    logoArquivoId: null,
  },
  {
    tipo: "CAUSA",
    id: "benef-mar",
    nome: "Mar Limpo",
    causa: "Oceanos",
    cidade: "Santos",
    uf: "SP",
    descricao: "Limpeza de praias e conscientização",
    site: null,
    logoArquivoId: null,
  },
  {
    tipo: "INSTITUICAO",
    id: "benef-educa",
    nome: "Educar para Mudar",
    causa: "Educação",
    cidade: "Recife",
    uf: "PE",
    descricao: "Reforço escolar em comunidades",
    site: "https://educarparamudar.org",
    logoArquivoId: null,
  },
];

const IDS_CATALOGO = CATALOGO.map((b) => b.id);

// Espera o catálogo carregar (lista renderizada pelo SeletorBeneficiada).
async function aguardarCatalogo() {
  await waitFor(() => {
    expect(screen.getByTestId("beneficiadas-lista")).toBeInTheDocument();
  });
}

// Seleciona a beneficiada cujo id = `id`, clicando no item real renderizado.
async function selecionarBeneficiada(
  user: ReturnType<typeof userEvent.setup>,
  id: string,
) {
  const item = screen.getByTestId(`beneficiada-item-${id}`);
  await user.click(item);
  // A marcação de seleção reflete o id escolhido (sanidade do fluxo de UI).
  await waitFor(() => {
    expect(item).toHaveAttribute("data-selected", "true");
  });
}

// Clica no botão "Continuar" habilitado para avançar/concluir.
async function continuar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

// Fetch mockado: catálogo para GET /beneficiadas e respostas de criação e
// submissão da campanha.
function instalarApi(): MockFetch {
  const mock = instalarMockFetch();
  mock.responderCom({ status: 200, body: CATALOGO });
  mock.responderPara("/campanhas", {
    status: 201,
    body: { id: "camp-1", idPublico: "pub-1" },
  });
  mock.responderPara("/campanhas/camp-1/submissao", { status: 204 });
  return mock;
}

// Corpo do POST /campanhas capturado pelo Mock_API.
function corpoDaCriacao(mock: MockFetch): Record<string, unknown> {
  const criacao = mock.chamadas.find(
    (c) => c.method === "POST" && c.url === "/api/campanhas",
  );
  expect(criacao).toBeDefined();
  return JSON.parse(criacao!.body as string) as Record<string, unknown>;
}

// O id vai no campo do tipo da beneficiada, e só nele.
function esperarIdNoCampoDoTipo(corpo: Record<string, unknown>, id: string) {
  const tipo = CATALOGO.find((b) => b.id === id)!.tipo;
  if (tipo === "CAUSA") {
    expect(corpo.causaId).toBe(id);
    expect(corpo).not.toHaveProperty("instituicaoId");
  } else {
    expect(corpo.instituicaoId).toBe(id);
    expect(corpo).not.toHaveProperty("causaId");
  }
}

// Preenche o passo 1: nome, descrição e a beneficiada escolhida.
async function preencherPasso1(
  user: ReturnType<typeof userEvent.setup>,
  idSelecionado: string,
) {
  fireEvent.change(
    screen.getByRole("textbox", { name: /Nome da campanha/i }),
    { target: { value: "Campanha Teste" } },
  );
  fireEvent.change(screen.getByRole("textbox", { name: /Descrição/i }), {
    target: { value: "Descrição da campanha de teste." },
  });
  await aguardarCatalogo();
  await selecionarBeneficiada(user, idSelecionado);
}

describe("Payload do wizard — Property 12: preservação do identificador no payload", () => {
  it(
    "salvar o rascunho no passo 1 envia no POST exatamente o id selecionado",
    { timeout: 120_000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.constantFrom(...IDS_CATALOGO), async (idSelecionado) => {
          const mock = instalarApi();
          push.mockClear();
          const user = userEvent.setup({ delay: null });

          try {
            render(
              <ThemeProvider theme={theme}>
                <CampaignWizardNew />
              </ThemeProvider>,
            );

            await preencherPasso1(user, idSelecionado);
            await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));

            await waitFor(() => expect(push).toHaveBeenCalledWith("/campanhas/camp-1"));
            esperarIdNoCampoDoTipo(corpoDaCriacao(mock), idSelecionado);
          } finally {
            cleanup();
            mock.restaurar();
          }
        }),
        { numRuns: 10 },
      );
    },
  );

  it(
    "enviar para análise no último passo envia no POST exatamente o id selecionado",
    { timeout: 120_000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...IDS_CATALOGO),
          // regraValor não vazio (destrava a validação do passo 2).
          fc.integer({ min: 1, max: 9999 }).map((n) => String(n)),
          async (idSelecionado, regraValor) => {
            const mock = instalarApi();
            const user = userEvent.setup({ delay: null });

            try {
              render(
                <ThemeProvider theme={theme}>
                  <CampaignWizardNew />
                </ThemeProvider>,
              );

              await preencherPasso1(user, idSelecionado);
              await continuar(user); // passo 1 → 2

              fireEvent.change(screen.getByLabelText(/Valor doado por unidade/i), {
                target: { value: regraValor },
              });
              fireEvent.change(screen.getByLabelText(/Início/i), {
                target: { value: "2026-11-01" },
              });
              await continuar(user); // passo 2 → 3

              await user.click(screen.getByRole("button", { name: "Enviar para análise" }));

              expect(
                await screen.findByText("Campanha enviada para análise."),
              ).toBeInTheDocument();
              esperarIdNoCampoDoTipo(corpoDaCriacao(mock), idSelecionado);
            } finally {
              cleanup();
              mock.restaurar();
            }
          },
        ),
        { numRuns: 10 },
      );
    },
  );
});
