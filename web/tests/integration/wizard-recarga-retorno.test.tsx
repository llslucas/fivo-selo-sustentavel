// Testes de integração de exemplo — recarga da lista de beneficiadas ao
// retornar ao Passo_Beneficiada (Task 9.5, Requisitos 5.5 e 5.6).
//
// Exercita o wizard real (`CampaignWizardNew`, cujo passo 1 é
// `StepSobreCampanha`; ajustado ao wizard único na vitrine-e-selo T41) contra
// o `fetch` global mockado via `instalarMockFetch`, sem rede de verdade.
// O passo consome `useBeneficiadas()`, que refaz a requisição a
// `GET /beneficiadas` sempre que o passo é remontado na navegação. Por isso,
// voltar ao passo dispara um novo carregamento da lista:
//
//   • Sucesso ao retornar (5.5): a lista recarrega com êxito e a beneficiada
//     previamente escolhida volta a aparecer marcada como selecionada
//     (data-selected="true"), pois a seleção vive no estado do wizard
//     (`data.instituicaoId`) e sobrevive à navegação.
//   • Falha ao retornar (5.6): a primeira carga tem sucesso (permite a seleção)
//     e a recarga ao voltar falha. A seleção (`instituicaoId`) é preservada — a
//     transição para erro não a limpa — e a indicação de erro
//     (data-testid="beneficiadas-erro") é exibida.
//
// São testes de EXEMPLO (não de propriedade): focados e determinísticos.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import type { Beneficiada } from "@/services/instituicoes";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import CampaignWizardNew from "@/components/campaign-wizard/CampaignWizardNew";

// ──────────────────────────────────────────────────────────────────────────
// Fixtures inline: catálogo determinístico com dois itens válidos.
// ──────────────────────────────────────────────────────────────────────────
const CATALOGO: Beneficiada[] = [
  {
    tipo: "INSTITUICAO",
    id: "inst-1",
    nome: "Casa do Bem",
    causa: "Educação",
    cidade: "São Paulo",
    uf: "SP",
    descricao: "Apoio a crianças em situação de vulnerabilidade.",
    site: null,
    logoArquivoId: null,
  },
  {
    tipo: "CAUSA",
    id: "causa-1",
    nome: "Mata em Pé",
    causa: "Meio ambiente",
    cidade: "Manaus",
    uf: "AM",
    descricao: "Reflorestamento de áreas degradadas.",
    site: null,
    logoArquivoId: null,
  },
];

const BENEFICIADA_ESCOLHIDA = CATALOGO[0];

// ──────────────────────────────────────────────────────────────────────────
// Infraestrutura de montagem
// ──────────────────────────────────────────────────────────────────────────
let mock: MockFetch;

beforeEach(() => {
  mock = instalarMockFetch();
});

afterEach(() => {
  mock.restaurar();
});

function renderizarComTema(ui: React.ReactNode) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// Preenche nome e descrição no passo 1, onde fica o Passo_Beneficiada.
async function preencherNomeEDescricao(
  usuario: ReturnType<typeof userEvent.setup>,
) {
  await usuario.type(
    screen.getByRole("textbox", { name: /Nome da campanha/i }),
    "Café que alimenta",
  );
  await usuario.type(
    screen.getByRole("textbox", { name: /Descrição/i }),
    "Parte da renda vai para a Casa do Bem.",
  );
}

// Espera o passo 2 (Regra de doação e vigência) aparecer.
async function aguardarPasso2() {
  await waitFor(
    () => {
      expect(
        screen.getByRole("heading", { name: /Regra de doação e vigência/i }),
      ).toBeInTheDocument();
    },
    { timeout: 15000 },
  );
}

// Localiza o item da beneficiada no seletor pelo seu data-testid estável.
function itemBeneficiada(id: string): HTMLElement {
  return screen.getByTestId(`beneficiada-item-${id}`);
}

describe("5.5 — recarga bem-sucedida ao retornar remarca a seleção", () => {
  it("volta ao passo, recarrega a lista e a beneficiada escolhida reaparece marcada", async () => {
    // `delay: null` torna a digitação instantânea (sem timers reais), evitando
    // que a suíte completa estoure o limite de tempo quando a máquina está sob
    // carga ao rodar todas as integrações juntas.
    const usuario = userEvent.setup({ delay: null });

    // Toda chamada a GET /beneficiadas responde com o catálogo (inclusive a
    // recarga ao voltar): o caminho de sucesso ao retornar (Req 5.5).
    mock.responderPara("/beneficiadas", { status: 200, body: CATALOGO });

    renderizarComTema(<CampaignWizardNew />);

    await preencherNomeEDescricao(usuario);

    // A lista carrega e a beneficiada ainda não está selecionada.
    const item = await waitFor(() => itemBeneficiada(BENEFICIADA_ESCOLHIDA.id), {
      timeout: 15000,
    });
    expect(item).toHaveAttribute("data-selected", "false");

    // Seleciona a beneficiada → registra instituicaoId no estado do wizard.
    await usuario.click(item);
    expect(itemBeneficiada(BENEFICIADA_ESCOLHIDA.id)).toHaveAttribute(
      "data-selected",
      "true",
    );

    // Navega para o passo 2 e volta ao passo 1 (o passo remonta e refaz a
    // requisição ao catálogo).
    await usuario.click(screen.getByRole("button", { name: "Continuar" }));
    await aguardarPasso2();

    await usuario.click(screen.getByRole("button", { name: "Voltar" }));

    // Após a recarga, a beneficiada previamente escolhida reaparece marcada
    // como selecionada (Req 5.5).
    await waitFor(
      () => {
        expect(itemBeneficiada(BENEFICIADA_ESCOLHIDA.id)).toHaveAttribute(
          "data-selected",
          "true",
        );
      },
      { timeout: 15000 },
    );
    // A outra beneficiada permanece não selecionada.
    expect(itemBeneficiada(CATALOGO[1].id)).toHaveAttribute(
      "data-selected",
      "false",
    );
  }, 30000);
});

describe("5.6 — falha na recarga ao retornar preserva a seleção e mostra erro", () => {
  it("preserva o instituicaoId e exibe a indicação de erro quando a recarga falha", async () => {
    // `delay: null` torna a digitação instantânea (sem timers reais), evitando
    // que a suíte completa estoure o limite de tempo quando a máquina está sob
    // carga ao rodar todas as integrações juntas.
    const usuario = userEvent.setup({ delay: null });

    // Primeira carga tem sucesso (permite a seleção).
    mock.responderPara("/beneficiadas", { status: 200, body: CATALOGO });

    renderizarComTema(<CampaignWizardNew />);

    await preencherNomeEDescricao(usuario);

    const item = await waitFor(() => itemBeneficiada(BENEFICIADA_ESCOLHIDA.id), {
      timeout: 15000,
    });

    // Seleciona a beneficiada e avança para o passo 2.
    await usuario.click(item);
    expect(itemBeneficiada(BENEFICIADA_ESCOLHIDA.id)).toHaveAttribute(
      "data-selected",
      "true",
    );
    await usuario.click(screen.getByRole("button", { name: "Continuar" }));
    await aguardarPasso2();

    // Configura a próxima requisição (a recarga ao voltar) para falhar por rede
    // → o Cliente_HTTP converte em ApiError(0, ...), que é recuperável.
    mock.falharPorRede();

    // Volta ao passo 1: o passo remonta e a recarga falha.
    await usuario.click(screen.getByRole("button", { name: "Voltar" }));

    // A indicação de erro de carregamento é exibida (Req 5.6).
    const erro = await screen.findByTestId(
      "beneficiadas-erro",
      {},
      { timeout: 15000 },
    );
    expect(erro).toBeInTheDocument();
    expect(
      within(erro).getByText(/Não foi possível conectar com o servidor/i),
    ).toBeInTheDocument();

    // A seleção (instituicaoId) é preservada: com nome e descrição ainda
    // preenchidos, o avanço do passo 1 continua destravado. Se o instituicaoId
    // tivesse sido limpo, a validação do passo bloquearia o avanço e o passo 2
    // não apareceria. Ele aparece → a seleção foi preservada (Req 5.6).
    await usuario.click(screen.getByRole("button", { name: "Continuar" }));
    await aguardarPasso2();
  }, 30000);
});
