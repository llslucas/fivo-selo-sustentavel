// Teste de propriedade da integração do catálogo em StepCausaRegra
// (web/src/components/campaign-wizard/steps/StepCausaRegra.tsx) — Task 7.2.
//
// Feature: catalogo-instituicoes-wizard, Property 14: Pré-cadastro não fabrica
// beneficiadas locais.
// Validates: Requirements 8.1, 8.3
//
// Simula interações com a afordância de pré-cadastro ("Não encontrou? Cadastrar
// uma nova instituição" → preencher nome/CNPJ → "Solicitar pré-cadastro") e
// afirma que:
//   - a lista de beneficiadas NÃO ganha itens fabricados: o conjunto de ids
//     renderizados (data-testid="beneficiada-item-<id>") permanece exatamente
//     igual ao catálogo retornado por GET /beneficiadas (Requisito 8.1);
//   - a seleção (data.instituicaoId) permanece inalterada: onChange nunca é
//     invocado com alteração de instituicaoId durante o fluxo (Requisitos 8.1, 8.3);
//   - os dados preenchidos no formulário de pré-cadastro (nome/CNPJ) persistem
//     após o acionamento (Requisito 8.3).
//
// O catálogo vem de um fetch mockado (Mock_API), nunca de rede real. StepCausaRegra
// usa useBeneficiadas() internamente, que busca via GET /beneficiadas; o mock
// responde com um catálogo fixo tanto para o catálogo completo quanto para
// qualquer termo de busca, de modo que a lista exibida não depende da interação
// com o pré-cadastro. Mínimo 100 iterações.

import { describe, it, expect, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import { useState } from "react";
import fc from "fast-check";

import theme from "@/theme";
import StepCausaRegra from "@/components/campaign-wizard/steps/StepCausaRegra";
import {
  initialWizardData,
  type CampaignWizardData,
} from "@/lib/campaign-wizard/types";
import type { Beneficiada } from "@/services/instituicoes";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

afterEach(() => {
  cleanup();
});

// Catálogo fixo e conhecido devolvido por GET /beneficiadas. A lista é a mesma
// para o catálogo completo e para qualquer termo de busca, isolando o efeito
// da interação de pré-cadastro: qualquer item "a mais" renderizado só poderia
// vir de fabricação local pelo componente.
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

// Harness que mantém `data` em estado (como os pais reais do wizard) e registra
// cada patch recebido via onChange, para asserção da preservação da seleção.
function HarnessStepCausaRegra({
  dadosIniciais,
  onPatch,
}: {
  dadosIniciais: CampaignWizardData;
  onPatch: (patch: Partial<CampaignWizardData>) => void;
}) {
  const [data, setData] = useState<CampaignWizardData>(dadosIniciais);

  return (
    <ThemeProvider theme={theme}>
      <StepCausaRegra
        data={data}
        onChange={(patch) => {
          onPatch(patch);
          setData((atual) => ({ ...atual, ...patch }));
        }}
      />
    </ThemeProvider>
  );
}

// Coleta o conjunto de ids atualmente renderizados como itens de beneficiada.
function idsRenderizados(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-testid^="beneficiada-item-"]'),
  ).map((el) =>
    (el.getAttribute("data-testid") ?? "").replace(/^beneficiada-item-/, ""),
  );
}

describe("StepCausaRegra — Property 14: pré-cadastro não fabrica beneficiadas locais", () => {
  it("acionar o pré-cadastro não adiciona itens à lista nem altera a seleção/os dados preenchidos", { timeout: 120_000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        // Nome e CNPJ digitados no formulário de pré-cadastro.
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
        // Seleção inicial: ou nula, ou um id do catálogo (para verificar que a
        // seleção pré-existente é preservada sob o acionamento).
        fc.option(fc.constantFrom(...IDS_CATALOGO), { nil: null }),
        async (novoNome, novoCnpj, selecaoInicial) => {
          const mock: MockFetch = instalarMockFetch();
          // Mesma resposta para catálogo completo e qualquer busca.
          mock.responderCom({ status: 200, body: CATALOGO });

          const patches: Array<Partial<CampaignWizardData>> = [];

          const dadosIniciais: CampaignWizardData = {
            ...initialWizardData,
            instituicaoId: selecaoInicial,
          };

          // delay: null acelera a digitação (sem esperas reais entre teclas),
          // mantendo 100 iterações dentro de um tempo razoável.
          const user = userEvent.setup({ delay: null });

          try {
            render(
              <HarnessStepCausaRegra
                dadosIniciais={dadosIniciais}
                onPatch={(patch) => patches.push(patch)}
              />,
            );

            // Aguarda o catálogo carregar (lista renderizada).
            await waitFor(() => {
              expect(screen.getByTestId("beneficiadas-lista")).toBeInTheDocument();
            });

            // Estado de referência ANTES de qualquer interação de pré-cadastro.
            const idsAntes = idsRenderizados();
            expect(idsAntes).toEqual(IDS_CATALOGO);
            const quantidadePatchesAntes = patches.length;

            // Abre o formulário de pré-cadastro.
            await user.click(
              screen.getByRole("button", {
                name: /Cadastrar uma nova instituição/i,
              }),
            );

            // Preenche nome e CNPJ. Usa fireEvent.change (em vez de user.type)
            // para definir o valor diretamente, já que os termos gerados podem
            // conter caracteres como "{", "[" que o userEvent interpretaria como
            // descritores de tecla. O objetivo aqui é a persistência do valor,
            // não a simulação tecla-a-tecla.
            const campoNome = screen.getByLabelText(
              "Nome da instituição",
            ) as HTMLInputElement;
            const campoCnpj = screen.getByLabelText("CNPJ") as HTMLInputElement;
            fireEvent.change(campoNome, { target: { value: novoNome } });
            fireEvent.change(campoCnpj, { target: { value: novoCnpj } });

            // Aciona "Solicitar pré-cadastro".
            await user.click(
              screen.getByRole("button", { name: "Solicitar pré-cadastro" }),
            );

            // A mensagem de indisponibilidade aparece (afordância em "em breve").
            expect(
              screen.getByTestId("pre-cadastro-indisponivel"),
            ).toBeInTheDocument();

            // A lista NÃO ganhou itens fabricados: mesmo conjunto/ordem de ids.
            expect(idsRenderizados()).toEqual(IDS_CATALOGO);

            // A seleção permanece inalterada: nenhum onChange com instituicaoId
            // foi emitido pela interação de pré-cadastro.
            const patchesDaInteracao = patches.slice(quantidadePatchesAntes);
            for (const patch of patchesDaInteracao) {
              expect(patch).not.toHaveProperty("instituicaoId");
            }

            // Os dados preenchidos persistem: os campos ainda contêm os valores
            // digitados.
            expect(campoNome).toHaveValue(novoNome);
            expect(campoCnpj).toHaveValue(novoCnpj);

            // Se havia seleção inicial, ela segue marcada no catálogo.
            if (selecaoInicial !== null) {
              const item = within(
                screen.getByTestId("beneficiadas-lista"),
              ).getByTestId(`beneficiada-item-${selecaoInicial}`);
              expect(item).toHaveAttribute("data-selected", "true");
            }
          } finally {
            cleanup();
            mock.restaurar();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
