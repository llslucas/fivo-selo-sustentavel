// Teste de integração da persistência do identificador de beneficiada ao
// navegar entre passos do wizard — Task 9.2, ajustado ao wizard único na
// vitrine-e-selo T41.
//
// Feature: catalogo-instituicoes-wizard, Property 11: Persistência do
// identificador na navegação.
// Validates: Requirements 5.4
//
// *Para qualquer* `instituicaoId` selecionado, navegar do Passo_Beneficiada
// para outro passo e retornar deve preservar o valor de `instituicaoId` no
// estado do wizard.
//
// Estratégia (integração, componente real `CampaignWizardNew`):
//   - O catálogo vem de um fetch mockado (Mock_API), nunca de rede real. O
//     passo 1 consome `useBeneficiadas()`, que busca via GET /beneficiadas e
//     recarrega a lista sempre que o passo é remontado.
//   - Ida curta: seleciona no passo 1, avança para o passo 2 e volta.
//   - Ida longa: seleciona no passo 1, preenche o passo 2, avança até a
//     revisão (passo 3) e volta dois passos; no caminho confere que o valor
//     da regra também foi mantido.
//   - Em ambos, afirma-se que a mesma beneficiada continua marcada
//     (data-selected="true") após a lista recarregar.
//
// Usa-se `fireEvent` (síncrono) para preencher campos e navegar — o objetivo
// aqui é persistência de estado, não simulação tecla-a-tecla.

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import fc from "fast-check";

import theme from "@/theme";
import type { Beneficiada } from "@/services/instituicoes";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import CampaignWizardNew from "@/components/campaign-wizard/CampaignWizardNew";

afterEach(() => {
  cleanup();
});

// Catálogo fixo e conhecido devolvido por GET /beneficiadas, tanto para o
// catálogo completo quanto para qualquer termo de busca. Isolar o catálogo
// garante que a lista exibida após a recarga seja estável e que a marcação de
// seleção dependa apenas do `instituicaoId` preservado no estado do wizard.
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

function renderizarComTema(ui: React.ReactNode) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// Aguarda a lista do catálogo renderizar (fim do estado "carregando").
async function aguardarListaCarregada() {
  await waitFor(() => {
    expect(screen.getByTestId("beneficiadas-lista")).toBeInTheDocument();
  });
}

// Define o valor de um campo de texto do MUI diretamente no <input>/<textarea>
// subjacente, de forma síncrona (fireEvent.change dispara o onChange do React).
function preencherCampo(nome: RegExp, valor: string) {
  const campo = screen.getByRole("textbox", { name: nome });
  fireEvent.change(campo, { target: { value: valor } });
}

// Clica num botão localizado pelo nome acessível.
function clicarBotao(nome: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: nome }));
}

// Localiza o item da lista correspondente a um id e afirma se está selecionado.
function itemSelecionado(id: string): boolean {
  const item = within(screen.getByTestId("beneficiadas-lista")).getByTestId(
    `beneficiada-item-${id}`,
  );
  return item.getAttribute("data-selected") === "true";
}

// Afirma que somente `idSelecionado` aparece marcado na lista recarregada.
function afirmarSomenteSelecionado(idSelecionado: string) {
  expect(itemSelecionado(idSelecionado)).toBe(true);
  for (const outroId of IDS_CATALOGO) {
    if (outroId !== idSelecionado) {
      expect(itemSelecionado(outroId)).toBe(false);
    }
  }
}

describe("Wizard — Property 11: persistência do instituicaoId na navegação", () => {
  it(
    "passo 1: seleção é preservada ao ir até a revisão e voltar dois passos",
    { timeout: 120_000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Beneficiada escolhida aleatoriamente do catálogo.
          fc.constantFrom(...IDS_CATALOGO),
          async (idSelecionado) => {
            const mock: MockFetch = instalarMockFetch();
            // Mesmo catálogo para catálogo completo e qualquer busca.
            mock.responderCom({ status: 200, body: CATALOGO });

            try {
              renderizarComTema(<CampaignWizardNew />);

              // Passo 1: nome, descrição e a beneficiada.
              await aguardarListaCarregada();
              preencherCampo(/Nome da campanha/i, "Campanha Teste");
              preencherCampo(/Descrição/i, "Descrição de teste.");
              fireEvent.click(
                within(screen.getByTestId("beneficiadas-lista")).getByTestId(
                  `beneficiada-item-${idSelecionado}`,
                ),
              );
              expect(itemSelecionado(idSelecionado)).toBe(true);
              clicarBotao("Continuar");

              // Passo 2: regra e início destravam o avanço até a revisão.
              fireEvent.change(screen.getByLabelText(/Valor doado por unidade/i), {
                target: { value: "2" },
              });
              fireEvent.change(screen.getByLabelText(/Início/i), {
                target: { value: "2026-11-01" },
              });
              clicarBotao("Continuar");
              await waitFor(() => {
                expect(
                  screen.getByRole("heading", { name: /Revise e envie/i }),
                ).toBeInTheDocument();
              });

              // Volta ao passo 2: o valor da regra continua lá.
              clicarBotao("Voltar");
              expect(screen.getByLabelText(/Valor doado por unidade/i)).toHaveValue(2);

              // Volta ao passo 1: a lista recarrega do zero.
              clicarBotao("Voltar");
              await aguardarListaCarregada();

              // Property 11: a mesma beneficiada aparece marcada após a
              // recarga, e nenhuma outra está marcada.
              afirmarSomenteSelecionado(idSelecionado);
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

  it(
    "passo 1: seleção é preservada ao avançar para o passo 2 e voltar",
    { timeout: 120_000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...IDS_CATALOGO),
          async (idSelecionado) => {
            const mock: MockFetch = instalarMockFetch();
            mock.responderCom({ status: 200, body: CATALOGO });

            try {
              renderizarComTema(<CampaignWizardNew />);

              // Passo 1 (Sobre a campanha): o catálogo já carrega aqui.
              await aguardarListaCarregada();

              // Preenche nome + descrição e seleciona a beneficiada. Os três
              // juntos destravam o avanço (stepValidations[1]).
              preencherCampo(/Nome da campanha/i, "Campanha Teste");
              preencherCampo(/Descrição/i, "Descrição de teste.");
              fireEvent.click(
                within(screen.getByTestId("beneficiadas-lista")).getByTestId(
                  `beneficiada-item-${idSelecionado}`,
                ),
              );
              expect(itemSelecionado(idSelecionado)).toBe(true);

              // Avança para o passo 2 (Regra de doação e vigência).
              clicarBotao("Continuar");
              await waitFor(() => {
                expect(
                  screen.getByRole("heading", {
                    name: /Regra de doação e vigência/i,
                  }),
                ).toBeInTheDocument();
              });

              // Volta ao passo 1 (Voltar). A lista recarrega do zero.
              clicarBotao("Voltar");
              await aguardarListaCarregada();

              // Property 11: a seleção foi preservada no estado do wizard.
              afirmarSomenteSelecionado(idSelecionado);
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
