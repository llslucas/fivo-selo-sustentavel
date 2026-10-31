// Teste de exemplo da mensagem de pré-cadastro indisponível em
// StepCausaRegra (web/src/components/campaign-wizard/steps/StepCausaRegra.tsx)
// — Task 7.4.
//
// StepCausaRegra integra o catálogo real (useBeneficiadas -> GET /beneficiadas)
// com a afordância de pré-cadastro em estado "em breve". Este exemplo exercita
// o fluxo visível pela empresa:
//   1. o passo carrega o catálogo (fetch mockado) e marca a instituição já
//      selecionada em data.instituicaoId;
//   2. a empresa abre o formulário de pré-cadastro e clica em "Solicitar
//      pré-cadastro";
//   3. a mensagem data-testid="pre-cadastro-indisponivel" aparece informando
//      que o pré-cadastro ainda não está disponível;
//   4. a seleção permanece intacta e onChange nunca é chamado com uma mudança
//      de instituicaoId (a afordância não fabrica nem altera a seleção).
//
// Requisitos: 8.2 (mensagem de indisponibilidade), 8.3 (seleção/dados
// preservados ao acionar a afordância).

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import StepCausaRegra from "@/components/campaign-wizard/steps/StepCausaRegra";
import { initialWizardData, type CampaignWizardData } from "@/lib/campaign-wizard/types";
import type { Beneficiada } from "@/services/instituicoes";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

// Pequeno catálogo controlado devolvido por GET /beneficiadas.
const CATALOGO: Beneficiada[] = [
  {
    tipo: "INSTITUICAO",
    id: "benef-1",
    nome: "Instituto Verde",
    causa: "Meio ambiente",
    cidade: "São Paulo",
    uf: "SP",
    descricao: "Reflorestamento urbano",
    site: "https://instituto-verde.org",
    logoArquivoId: null,
  },
  {
    tipo: "INSTITUICAO",
    id: "benef-2",
    nome: "Casa Solidária",
    causa: "Assistência social",
    cidade: "Rio de Janeiro",
    uf: "RJ",
    descricao: "Apoio a famílias em vulnerabilidade",
    site: null,
    logoArquivoId: null,
  },
];

// Instituição previamente selecionada no estado do wizard.
const SELECIONADA_ID = "benef-1";

// Monta um CampaignWizardData com a instituição já selecionada.
function montarData(): CampaignWizardData {
  return {
    ...initialWizardData,
    nome: "Campanha Teste",
    descricao: "",
    instituicaoId: SELECIONADA_ID,
    regraTipo: "valor_fixo",
    regraValor: "2",
    logoFile: null,
    logoPreviewUrl: null,
    mostrarValorNoSelo: true,
    vincularCampanha: true,
  };
}

let mock: MockFetch | null = null;

afterEach(() => {
  mock?.restaurar();
  mock = null;
});

function montar() {
  mock = instalarMockFetch();
  // O catálogo é servido com sucesso (200) para qualquer GET /beneficiadas.
  mock.responderCom({ status: 200, body: CATALOGO });

  const onChange = vi.fn();
  const data = montarData();

  const utils = render(
    <ThemeProvider theme={theme}>
      <StepCausaRegra data={data} onChange={onChange} />
    </ThemeProvider>,
  );

  return { ...utils, onChange };
}

describe("StepCausaRegra — mensagem de pré-cadastro indisponível (Task 7.4)", () => {
  it("acionar o pré-cadastro mostra a mensagem de indisponibilidade e preserva a seleção (Req 8.2, 8.3)", async () => {
    const user = userEvent.setup();
    const { onChange } = montar();

    // O catálogo carrega e a instituição previamente selecionada aparece
    // marcada (data-selected="true"). Esperamos a lista aparecer (fim do
    // estado "carregando" na montagem).
    const itemSelecionado = await screen.findByTestId(
      `beneficiada-item-${SELECIONADA_ID}`,
    );
    expect(itemSelecionado).toHaveAttribute("data-selected", "true");

    // A mensagem de indisponibilidade ainda não está visível.
    expect(
      screen.queryByTestId("pre-cadastro-indisponivel"),
    ).not.toBeInTheDocument();

    // Abre o formulário de pré-cadastro.
    await user.click(
      screen.getByRole("button", {
        name: /Não encontrou\? Cadastrar uma nova instituição/i,
      }),
    );

    // Aciona a afordância de pré-cadastro.
    await user.click(
      screen.getByRole("button", { name: /Solicitar pré-cadastro/i }),
    );

    // A mensagem de "pré-cadastro ainda não está disponível" aparece.
    const mensagem = await screen.findByTestId("pre-cadastro-indisponivel");
    expect(mensagem).toBeInTheDocument();
    expect(mensagem).toHaveTextContent(/ainda não está disponível/i);

    // A seleção permanece: o item continua marcado como selecionado...
    expect(
      screen.getByTestId(`beneficiada-item-${SELECIONADA_ID}`),
    ).toHaveAttribute("data-selected", "true");

    // ...e onChange nunca foi chamado com uma mudança de instituicaoId
    // (a afordância não altera nem fabrica seleção).
    const chamadasComInstituicao = onChange.mock.calls.filter(
      ([patch]) =>
        patch != null &&
        Object.prototype.hasOwnProperty.call(patch, "instituicaoId"),
    );
    expect(chamadasComInstituicao).toHaveLength(0);
  });
});
