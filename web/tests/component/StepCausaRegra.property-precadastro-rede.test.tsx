// Teste de propriedade de StepCausaRegra
// (web/src/components/campaign-wizard/steps/StepCausaRegra.tsx).
//
// Task 7.3 — A afordância de pré-cadastro não emite requisição de rede.
//
// O passo monta o catálogo real via GET /beneficiadas (chamada esperada na
// montagem, conduzida pelo hook useBeneficiadas). O que esta propriedade
// verifica é que QUALQUER interação com a afordância de pré-cadastro — abrir o
// formulário, preencher nome/CNPJ e clicar em "Solicitar pré-cadastro" — não
// adiciona NENHUMA requisição a qualquer rota: o estado é apenas "em breve".
//
// Estratégia: deixamos a chamada de montagem assentar e registramos a contagem
// de chamadas do fetch espionado; em seguida exercitamos a afordância de
// pré-cadastro com valores arbitrários e afirmamos que a contagem de chamadas
// NÃO aumentou (nenhuma rota foi acionada como efeito do pré-cadastro).

import { describe, it, expect, afterEach } from "vitest";
import fc from "fast-check";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import StepCausaRegra from "@/components/campaign-wizard/steps/StepCausaRegra";
import { initialWizardData } from "@/lib/campaign-wizard/types";
import { instalarMockFetch } from "../helpers/mockFetch";

// Cada iteração monta e desmonta sua própria árvore; o afterEach global também
// desmonta e restaura o fetch stubado. Garantimos independência de ordem.
afterEach(() => {
  cleanup();
});

// Catálogo mínimo e estável para a resposta de montagem. O conteúdo em si é
// irrelevante para esta propriedade: só precisamos que a montagem complete sem
// bater na guarda anti-rede.
const CATALOGO_FIXO = [
  {
    tipo: "INSTITUICAO" as const,
    id: "11111111-1111-1111-1111-111111111111",
    nome: "Instituição Exemplo",
    causa: null,
    cidade: null,
    uf: null,
    descricao: "Descrição exemplo",
    site: null,
    logoArquivoId: null,
  },
];

describe("StepCausaRegra — pré-cadastro não emite requisição de rede", () => {
  // Feature: catalogo-instituicoes-wizard, Property 15: Pré-cadastro não emite requisição de rede
  // Validates: Requirements 8.6
  it("Property 15: acionar a afordância de pré-cadastro não emite nenhuma requisição a qualquer rota", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Valores arbitrários digitados nos campos do pré-cadastro. Incluímos o
        // vazio para cobrir a submissão sem preenchimento.
        fc.string({ maxLength: 40 }),
        fc.string({ maxLength: 20 }),
        async (nome, cnpj) => {
          const mock = instalarMockFetch();
          // Qualquer rota responde com catálogo; assim, se o pré-cadastro
          // emitisse alguma requisição (a qualquer rota), ela seria capturada.
          mock.responderCom({ status: 200, body: CATALOGO_FIXO });

          const { getByText, findByText, getByLabelText } = render(
            <ThemeProvider theme={theme}>
              <StepCausaRegra data={initialWizardData} onChange={() => {}} />
            </ThemeProvider>,
          );

          // Deixa a chamada de montagem (GET /beneficiadas) assentar.
          await findByText("Instituição Exemplo");

          // Linha de base: chamadas já emitidas pela montagem (esperadas).
          const chamadasAposMontagem = mock.chamadas.length;

          // Abre o formulário de pré-cadastro.
          fireEvent.click(
            getByText("Não encontrou? Cadastrar uma nova instituição"),
          );

          // Preenche os campos com valores arbitrários.
          fireEvent.change(getByLabelText("Nome da instituição"), {
            target: { value: nome },
          });
          fireEvent.change(getByLabelText("CNPJ"), {
            target: { value: cnpj },
          });

          // Aciona a afordância de pré-cadastro.
          fireEvent.click(getByText("Solicitar pré-cadastro"));

          // A afordância sinaliza "em breve" — e nada mais. Esperamos a
          // mensagem aparecer para garantir que o efeito do clique assentou.
          await waitFor(() => {
            expect(
              getByText(/pré-cadastro de instituições ainda não está disponível/i),
            ).toBeInTheDocument();
          });

          // Propriedade central: nenhuma requisição adicional foi emitida a
          // qualquer rota como efeito da interação de pré-cadastro.
          expect(mock.chamadas.length).toBe(chamadasAposMontagem);

          cleanup();
          mock.restaurar();
        },
      ),
      { numRuns: 100 },
    );
  }, 60_000);
});
