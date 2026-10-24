// Teste de integração do payload final do wizard de campanha (web/) — Task 9.3.
//
// Feature: catalogo-instituicoes-wizard, Property 12: Preservação do
// identificador no payload.
// Validates: Requirements 6.1, 6.3
//
// Propriedade: para qualquer `instituicaoId` não nulo e não vazio selecionado
// pela empresa no catálogo real, concluir o Wizard_Campanha deve incluir no
// Payload_Criacao_Campanha (= o `data`/CampaignWizardData levado à conclusão)
// exatamente esse mesmo identificador — igual ao `id` da Beneficiada escolhida.
//
// Estratégia: exercita os COMPONENTES REAIS do wizard (`CampaignWizard`, passo
// 2 via StepCausaRegra; `CampaignWizardNew`, passo 1 via StepSobreCampanha). A
// seleção da beneficiada é feita clicando no item real renderizado pelo
// `SeletorBeneficiada`, de modo que o id realmente percorre o fluxo
// onSelecionar → onChange → estado do wizard. Ao concluir, ambos os wizards
// renderizam `<SuccessScreen data={data} />`; mockamos `SuccessScreen` apenas
// para capturar o `data` recebido na conclusão — o Payload_Criacao_Campanha —
// e afirmamos que `data.instituicaoId` é exatamente o id selecionado.
//
// O catálogo vem de um fetch mockado (Mock_API), nunca de rede real. Mínimo
// 100 iterações.

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

// ──────────────────────────────────────────────────────────────────────────
// Captura do Payload_Criacao_Campanha: `SuccessScreen` é mockado para registrar
// o `data` recebido quando o wizard conclui, sem renderizar a tela real (que
// não expõe o instituicaoId no DOM). Os wizards reais continuam sendo
// exercitados de ponta a ponta — apenas a tela final é substituída por uma
// sonda.
// ──────────────────────────────────────────────────────────────────────────
const payloadsCapturados: Array<{ instituicaoId: string | null }> = [];

vi.mock("@/components/campaign-wizard/SuccessScreen", () => ({
  default: ({ data }: { data: { instituicaoId: string | null } }) => {
    payloadsCapturados.push(data);
    return <div data-testid="payload-capturado" />;
  },
}));

// Import dos wizards REAIS (após o vi.mock acima, que é içado ao topo).
import CampaignWizard from "@/components/campaign-wizard/CampaignWizard";
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

describe("Payload do wizard — Property 12: preservação do identificador no payload", () => {
  it(
    "CampaignWizard (passo 2): concluir inclui no payload exatamente o id selecionado",
    { timeout: 120_000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...IDS_CATALOGO),
          // regraValor não vazio (destrava a validação do passo 2).
          fc.integer({ min: 1, max: 9999 }).map((n) => String(n)),
          async (idSelecionado, regraValor) => {
            const mock: MockFetch = instalarMockFetch();
            mock.responderCom({ status: 200, body: CATALOGO });
            payloadsCapturados.length = 0;

            const user = userEvent.setup({ delay: null });

            try {
              render(
                <ThemeProvider theme={theme}>
                  <CampaignWizard />
                </ThemeProvider>,
              );

              // Passo 1 (StepInfo): nome + descrição não vazios.
              fireEvent.change(
                screen.getByRole("textbox", { name: /Nome da campanha/i }),
                { target: { value: "Campanha Teste" } },
              );
              fireEvent.change(
                screen.getByRole("textbox", { name: /Descrição/i }),
                { target: { value: "Descrição da campanha de teste." } },
              );
              await continuar(user); // passo 1 → 2

              // Passo 2 (StepCausaRegra): selecionar beneficiada + regraValor.
              await aguardarCatalogo();
              await selecionarBeneficiada(user, idSelecionado);
              fireEvent.change(
                screen.getByLabelText(/Valor doado por unidade/i),
                { target: { value: regraValor } },
              );

              // O botão "Continuar" fica habilitado quando o passo 2 é válido.
              await waitFor(() => {
                expect(
                  screen.getByRole("button", { name: "Continuar" }),
                ).toBeEnabled();
              });
              await continuar(user); // passo 2 → 3

              // Passo 3 (StepSelo): sempre válido; concluir.
              await continuar(user); // passo 3 → concluído

              // O payload capturado na conclusão inclui exatamente o id escolhido.
              await waitFor(() => {
                expect(
                  screen.getByTestId("payload-capturado"),
                ).toBeInTheDocument();
              });
              expect(payloadsCapturados).toHaveLength(1);
              expect(payloadsCapturados[0].instituicaoId).toBe(idSelecionado);
            } finally {
              cleanup();
              mock.restaurar();
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it(
    "CampaignWizardNew (passo 1): concluir inclui no payload exatamente o id selecionado",
    { timeout: 120_000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...IDS_CATALOGO),
          async (idSelecionado) => {
            const mock: MockFetch = instalarMockFetch();
            mock.responderCom({ status: 200, body: CATALOGO });
            payloadsCapturados.length = 0;

            const user = userEvent.setup({ delay: null });

            try {
              render(
                <ThemeProvider theme={theme}>
                  <CampaignWizardNew />
                </ThemeProvider>,
              );

              // Passo 1 (StepSobreCampanha): nome + descrição + beneficiada.
              fireEvent.change(
                screen.getByRole("textbox", { name: /Nome da campanha/i }),
                { target: { value: "Campanha Teste" } },
              );
              fireEvent.change(
                screen.getByRole("textbox", { name: /Descrição/i }),
                { target: { value: "Descrição da campanha de teste." } },
              );
              await aguardarCatalogo();
              await selecionarBeneficiada(user, idSelecionado);

              await waitFor(() => {
                expect(
                  screen.getByRole("button", { name: "Continuar" }),
                ).toBeEnabled();
              });
              await continuar(user); // passo 1 → 2

              // Passo 2 (StepModeloSelo): escolher um modelo de selo.
              await user.click(screen.getByText(/Modelo 3 · Escudo/i));
              await waitFor(() => {
                expect(
                  screen.getByRole("button", { name: "Continuar" }),
                ).toBeEnabled();
              });
              await continuar(user); // passo 2 → 3

              // Passo 3 (StepSelo): sempre válido; concluir.
              await continuar(user); // passo 3 → concluído

              await waitFor(() => {
                expect(
                  screen.getByTestId("payload-capturado"),
                ).toBeInTheDocument();
              });
              expect(payloadsCapturados).toHaveLength(1);
              expect(payloadsCapturados[0].instituicaoId).toBe(idSelecionado);
            } finally {
              cleanup();
              mock.restaurar();
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
