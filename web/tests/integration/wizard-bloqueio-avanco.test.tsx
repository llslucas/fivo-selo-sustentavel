// Teste de integração de propriedade do bloqueio de avanço sem seleção de
// beneficiada, exercitando os dois pais do wizard de campanha:
//   • CampaignWizard      (seleção no passo 2, via StepCausaRegra)
//   • CampaignWizardNew   (seleção no passo 1, via StepSobreCampanha)
//
// Cobre a Task 9.4:
// - Feature: catalogo-instituicoes-wizard, Property 13: Bloqueio de avanço sem
//   seleção.
//
// A propriedade afirma que, enquanto `data.instituicaoId` é nulo (ou vazio), a
// validação do Passo_Beneficiada impede o avanço — ou seja, o botão de avançar
// ("Continuar") permanece desabilitado. Para isolar APENAS a ausência de
// seleção como causa do bloqueio, todos os demais campos exigidos pela
// validação do passo são preenchidos:
//   • CampaignWizard (passo 2): além da seleção, a validação exige
//     `regraValor.trim().length > 0`. Preenchemos `regraValor` para que SÓ a
//     ausência de `instituicaoId` bloqueie o avanço.
//   • CampaignWizardNew (passo 1): a validação exige `nome`, `descricao` e
//     `instituicaoId`. Preenchemos `nome` e `descricao`, deixando apenas
//     `instituicaoId` nulo.
//
// O catálogo real (GET /beneficiadas) é servido por fetch mockado
// (instalarMockFetch): respondemos 200 com uma lista válida para que o
// Passo_Beneficiada alcance o estado "carregado" e exiba a lista — mas NUNCA
// selecionamos nenhum item, mantendo `instituicaoId` nulo. O fast-check varia os
// demais campos preenchidos (nome/descrição/valor da regra) ao longo das
// iterações, enquanto a seleção permanece ausente; em todas as execuções o botão
// "Continuar" deve estar desabilitado.
//
// Validates: Requirements 6.2, 6.4

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import fc from "fast-check";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import CampaignWizard from "@/components/campaign-wizard/CampaignWizard";
import CampaignWizardNew from "@/components/campaign-wizard/CampaignWizardNew";
import type { Beneficiada } from "@/services/instituicoes";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

// Catálogo válido devolvido por GET /beneficiadas. Precisa ter itens para que o
// passo chegue ao estado "carregado" (a lista aparece, mas nada é selecionado).
const CATALOGO: Beneficiada[] = [
  {
    tipo: "INSTITUICAO",
    id: "inst-1",
    nome: "Casa do Bem",
    causa: "Educação",
    cidade: "São João da Boa Vista",
    uf: "SP",
    descricao: "Apoio à merenda escolar de crianças da região.",
    site: null,
    logoArquivoId: null,
  },
  {
    tipo: "CAUSA",
    id: "causa-1",
    nome: "Reflorestar Já",
    causa: "Meio ambiente",
    cidade: null,
    uf: null,
    descricao: "Plantio de mudas nativas em áreas degradadas.",
    site: null,
    logoArquivoId: null,
  },
];

// Gera texto não vazio e seguro para `userEvent.type`, que interpreta `{`, `}`,
// `[` e `]` como sequências especiais de teclado. Restringimos o alfabeto a
// letras, dígitos e espaço, prefixando com um caractere fixo para garantir
// conteúdo não vazio após qualquer trim.
function textoDigitavel(prefixo: string): fc.Arbitrary<string> {
  const alfabeto = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJ0123456789 ".split("");
  return fc
    .array(fc.constantFrom(...alfabeto), { maxLength: 30 })
    .map((chars) => `${prefixo} ${chars.join("")}`);
}

let mock: MockFetch;

beforeEach(() => {
  mock = instalarMockFetch();
  // GET /beneficiadas sempre resolve com o catálogo; nenhuma rede real é tocada.
  mock.responderPara("/beneficiadas", { status: 200, body: CATALOGO });
});

afterEach(() => {
  mock.restaurar();
  cleanup();
});

function renderizarComTema(ui: React.ReactNode) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// Desmonta a árvore da iteração e deixa os timers reais pendentes do hook
// (debounce de 300 ms) drenarem antes da próxima iteração, evitando que um
// timer de uma iteração anterior dispare durante a renderização da seguinte e
// contamine o DOM. O `cleanup` do React já aborta a requisição em voo via o
// cleanup do efeito do hook.
async function encerrarIteracao() {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 350));
}

// Localiza o botão de avançar ("Continuar") do WizardShell / WizardShellForm.
function botaoAvancar(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement;
}

// Espera o Passo_Beneficiada sair do carregamento e exibir a lista do catálogo.
async function aguardarCatalogoCarregado() {
  await waitFor(
    () => {
      expect(screen.getByTestId("beneficiadas-lista")).toBeInTheDocument();
    },
    { timeout: 4000 },
  );
}

describe("Wizard — bloqueio de avanço sem seleção de beneficiada", () => {
  // Feature: catalogo-instituicoes-wizard, Property 13: Bloqueio de avanço sem seleção
  // Validates: Requirements 6.2, 6.4
  it("Property 13 (CampaignWizard, passo 2): com instituicaoId nulo, o avanço fica bloqueado mesmo com os demais campos preenchidos", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Varia os campos que NÃO são a seleção: nome e descrição (passo 1) e o
        // valor da regra (exigido pela validação do passo 2). Todos não vazios
        // para garantir que a única causa de bloqueio seja a ausência de seleção.
        fc.record({
          nome: textoDigitavel("C"),
          descricao: textoDigitavel("D"),
          valorRegra: fc.integer({ min: 1, max: 999 }).map((n) => String(n)),
        }),
        async ({ nome, descricao, valorRegra }) => {
          const usuario = userEvent.setup({ delay: null });
          try {
            renderizarComTema(<CampaignWizard />);

            // Passo 1 — preenche nome e descrição e avança.
            await usuario.type(
              screen.getByRole("textbox", { name: /Nome da campanha/i }),
              nome,
            );
            await usuario.type(
              screen.getByRole("textbox", { name: /Descrição/i }),
              descricao,
            );
            await usuario.click(botaoAvancar());

            // Passo 2 — espera o catálogo carregar e preenche o valor da regra,
            // mas NÃO seleciona nenhuma beneficiada (instituicaoId permanece null).
            await aguardarCatalogoCarregado();
            const campoValor = screen.getByRole("spinbutton");
            await usuario.clear(campoValor);
            await usuario.type(campoValor, valorRegra);

            // Com tudo preenchido exceto a seleção, o avanço deve continuar
            // bloqueado: o botão "Continuar" está desabilitado (Req 6.2, 6.4).
            expect(botaoAvancar()).toBeDisabled();

            // Nenhum item do catálogo aparece selecionado.
            const lista = screen.getByTestId("beneficiadas-lista");
            for (const b of CATALOGO) {
              expect(
                within(lista).getByTestId(`beneficiada-item-${b.id}`),
              ).toHaveAttribute("data-selected", "false");
            }
          } finally {
            // Sempre desmonta a árvore desta iteração, mesmo quando uma asserção
            // falha, para que a próxima iteração renderize em um DOM limpo.
            await encerrarIteracao();
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 200000);

  // Feature: catalogo-instituicoes-wizard, Property 13: Bloqueio de avanço sem seleção
  // Validates: Requirements 6.2, 6.4
  it("Property 13 (CampaignWizardNew, passo 1): com instituicaoId nulo, o avanço fica bloqueado mesmo com nome e descrição preenchidos", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          nome: textoDigitavel("C"),
          descricao: textoDigitavel("D"),
        }),
        async ({ nome, descricao }) => {
          const usuario = userEvent.setup({ delay: null });
          try {
            renderizarComTema(<CampaignWizardNew />);

            // Passo 1 — espera o catálogo carregar e preenche nome e descrição,
            // mas NÃO seleciona nenhuma beneficiada (instituicaoId permanece null).
            await aguardarCatalogoCarregado();
            await usuario.type(
              screen.getByRole("textbox", { name: /Nome da campanha/i }),
              nome,
            );
            await usuario.type(
              screen.getByRole("textbox", { name: /Descrição/i }),
              descricao,
            );

            // Nome e descrição preenchidos, mas sem seleção: o avanço continua
            // bloqueado — o botão "Continuar" está desabilitado (Req 6.2, 6.4).
            expect(botaoAvancar()).toBeDisabled();

            const lista = screen.getByTestId("beneficiadas-lista");
            for (const b of CATALOGO) {
              expect(
                within(lista).getByTestId(`beneficiada-item-${b.id}`),
              ).toHaveAttribute("data-selected", "false");
            }
          } finally {
            await encerrarIteracao();
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 200000);
});

