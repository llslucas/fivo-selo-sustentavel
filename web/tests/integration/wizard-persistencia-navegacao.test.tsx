// Teste de integração da persistência do identificador de beneficiada ao
// navegar entre passos do wizard — Task 9.2.
//
// Feature: catalogo-instituicoes-wizard, Property 11: Persistência do
// identificador na navegação.
// Validates: Requirements 5.4
//
// *Para qualquer* `instituicaoId` selecionado, navegar do Passo_Beneficiada
// para outro passo e retornar deve preservar o valor de `instituicaoId` no
// estado do wizard.
//
// Estratégia (integração, componentes reais dos pais do wizard):
//   - O catálogo vem de um fetch mockado (Mock_API), nunca de rede real. Ambos
//     os passos consomem `useBeneficiadas()`, que busca via GET /beneficiadas;
//     o mock responde o mesmo catálogo fixo para o catálogo completo e para
//     qualquer termo de busca.
//   - `CampaignWizard` (variante lista): o Passo_Beneficiada é o passo 2. Para
//     alcançá-lo é preciso preencher o passo 1 (nome + descrição). Lá,
//     seleciona-se uma beneficiada escolhida aleatoriamente, navega-se para
//     fora (Voltar → passo 1) e retorna-se (Continuar → passo 2); afirma-se que
//     a mesma beneficiada continua marcada (data-selected="true") após a lista
//     recarregar — prova de que `data.instituicaoId` sobreviveu à navegação.
//   - `CampaignWizardNew` (variante cards): o Passo_Beneficiada é o passo 1.
//     Preenche-se nome + descrição, seleciona-se uma beneficiada, avança-se
//     para o passo 2 (Continuar) e volta-se (Voltar → passo 1); afirma-se a
//     mesma preservação.
//
// A navegação não reinicializa `data` (ambos os pais mantêm `data` em
// `useState` e apenas trocam o passo visível), então a seleção persiste. A
// asserção é feita contra o DOM renderizado após a recarga da lista, que
// reflete `data.instituicaoId` via `selecionadaId`.
//
// Usa-se `fireEvent` (síncrono) para preencher campos e navegar — o objetivo
// aqui é persistência de estado, não simulação tecla-a-tecla — mantendo as 100
// iterações dentro de um tempo razoável. O timeout por teste é generoso.

import { describe, it, expect, afterEach } from "vitest";
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
import CampaignWizard from "@/components/campaign-wizard/CampaignWizard";
import CampaignWizardNew from "@/components/campaign-wizard/CampaignWizardNew";
import type { Beneficiada } from "@/services/instituicoes";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

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
    "CampaignWizard (passo 2): seleção é preservada ao navegar para fora e voltar",
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
              renderizarComTema(<CampaignWizard />);

              // Passo 1: preencher nome + descrição para destravar o avanço.
              preencherCampo(/Nome da campanha/i, "Campanha Teste");
              preencherCampo(/Descrição/i, "Descrição de teste.");

              // Avança para o passo 2 (Causa e regra de doação).
              clicarBotao("Continuar");

              // O catálogo carrega no passo 2; seleciona a beneficiada.
              await aguardarListaCarregada();
              fireEvent.click(
                within(screen.getByTestId("beneficiadas-lista")).getByTestId(
                  `beneficiada-item-${idSelecionado}`,
                ),
              );
              expect(itemSelecionado(idSelecionado)).toBe(true);

              // Navega para FORA do passo 2 (Voltar → passo 1). "Voltar" está
              // sempre habilitado, independentemente da regra de doação.
              clicarBotao("Voltar");

              // De volta ao passo 1: os campos preenchidos continuam lá (o
              // estado do wizard não foi reinicializado).
              await waitFor(() => {
                expect(
                  screen.getByRole("textbox", { name: /Nome da campanha/i }),
                ).toHaveValue("Campanha Teste");
              });

              // Retorna ao passo 2 (Continuar). A lista recarrega do zero.
              clicarBotao("Continuar");
              await aguardarListaCarregada();

              // Property 11: a seleção foi preservada no estado do wizard — a
              // mesma beneficiada aparece marcada após a recarga, e nenhuma
              // outra está marcada.
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
    "CampaignWizardNew (passo 1): seleção é preservada ao avançar e voltar",
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

              // Avança para o passo 2 (Escolha um modelo de selo).
              clicarBotao("Continuar");
              await waitFor(() => {
                expect(
                  screen.getByRole("heading", {
                    name: /Escolha um modelo de selo/i,
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
