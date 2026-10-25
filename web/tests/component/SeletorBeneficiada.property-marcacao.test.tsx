// Teste de propriedade do componente apresentacional SeletorBeneficiada
// (web/src/components/campaign-wizard/SeletorBeneficiada.tsx).
//
// Cobre a Task 5.5:
// - Feature: catalogo-instituicoes-wizard, Property 10: Marcação de seleção
//   reflete o identificador.
//
// A propriedade gera listas de beneficiadas (com ids únicos) e um
// `selecionadaId` aleatório que ora coincide com exatamente um item, ora não
// coincide com nenhum (id inexistente ou `null`). Em ambos os casos afirma que:
//   (a) quando o id corresponde a exatamente uma beneficiada, apenas essa
//       beneficiada aparece selecionada (aria-selected/data-selected "true") e
//       todas as demais aparecem não selecionadas;
//   (b) quando o id não corresponde a nenhuma beneficiada (ou é null), nenhuma
//       beneficiada aparece selecionada.
//
// O componente é puramente apresentacional (sem rede), então é renderizado
// diretamente sob o ThemeProvider do MUI, no estado "carregado". Cada item
// expõe data-testid="beneficiada-item-<id>", aria-selected e data-selected.

import { describe, it, expect, afterEach } from "vitest";
import fc from "fast-check";
import { render, screen, cleanup } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import SeletorBeneficiada from "@/components/campaign-wizard/SeletorBeneficiada";
import type { Beneficiada } from "@/services/instituicoes";

afterEach(() => {
  cleanup();
});

// Gera uma Beneficiada válida a partir de um id já garantido como único pela
// combinação na propriedade. Nome e descrição são não vazios para refletirem o
// formato do catálogo real.
function arbBeneficiada(id: string): fc.Arbitrary<Beneficiada> {
  return fc.record({
    tipo: fc.constantFrom<"INSTITUICAO" | "CAUSA">("INSTITUICAO", "CAUSA"),
    nome: fc.string({ minLength: 1, maxLength: 40 }).map((s) => `N ${s}`),
    descricao: fc.string({ minLength: 1, maxLength: 60 }).map((s) => `D ${s}`),
    causa: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
    cidade: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
    uf: fc.option(fc.string({ minLength: 2, maxLength: 2 }), { nil: null }),
    site: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
    logoArquivoId: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
  }).map((parcial) => ({ ...parcial, id }));
}

function renderizar(beneficiadas: Beneficiada[], selecionadaId: string | null) {
  return render(
    <ThemeProvider theme={theme}>
      <SeletorBeneficiada
        beneficiadas={beneficiadas}
        estado="carregado"
        termoBusca=""
        mensagemErro=""
        podeTentarNovamente={false}
        selecionadaId={selecionadaId}
        onBuscar={() => {}}
        onTentarNovamente={() => {}}
        onSelecionar={() => {}}
        variante="lista"
      />
    </ThemeProvider>,
  );
}

describe("SeletorBeneficiada — marcação de seleção reflete o identificador", () => {
  // Feature: catalogo-instituicoes-wizard, Property 10: Marcação de seleção reflete o identificador
  // Validates: Requirements 5.2, 5.3
  it("Property 10: só a beneficiada cujo id coincide aparece selecionada; nenhuma quando não há correspondência", () => {
    fc.assert(
      fc.property(
        // Lista de ids únicos (1..8 itens) e a escolha do seletor.
        fc
          .uniqueArray(
            fc.integer({ min: 0, max: 100000 }).map((n) => `id-${n}`),
            {
              minLength: 1,
              maxLength: 8,
            },
          )
          .chain((ids) =>
            fc.record({
              beneficiadas: fc.tuple(...ids.map((id) => arbBeneficiada(id))),
              // Seletor: um dos ids existentes, um id garantidamente inexistente,
              // ou null. Garante que ambos os ramos sejam exercitados.
              selecionadaId: fc.oneof(
                fc.constantFrom(...ids),
                fc.constant("id-inexistente-xyz"),
                fc.constant(null),
              ),
            }),
          ),
        ({ beneficiadas, selecionadaId }) => {
          renderizar(beneficiadas as Beneficiada[], selecionadaId);

          const lista = beneficiadas as Beneficiada[];
          const correspondentes = lista.filter((b) => b.id === selecionadaId);

          // Para cada item renderizado, verifica a marcação esperada: selecionado
          // somente quando seu id coincide com o selecionadaId.
          for (const b of lista) {
            const el = screen.getByTestId(`beneficiada-item-${b.id}`);
            const deveEstarSelecionado = b.id === selecionadaId;

            expect(el).toHaveAttribute(
              "aria-selected",
              String(deveEstarSelecionado),
            );
            expect(el).toHaveAttribute(
              "data-selected",
              String(deveEstarSelecionado),
            );
          }

          // Caso (a): id corresponde a exatamente uma beneficiada => só ela
          // selecionada. Caso (b): nenhuma correspondência => nenhuma selecionada.
          const selecionados = lista.filter(
            (b) =>
              screen
                .getByTestId(`beneficiada-item-${b.id}`)
                .getAttribute("data-selected") === "true",
          );
          expect(selecionados.length).toBe(correspondentes.length);
          // Como os ids são únicos, correspondentes é 0 ou 1.
          expect(correspondentes.length).toBeLessThanOrEqual(1);

          cleanup();
        },
      ),
      { numRuns: 10 },
    );
  });
});
