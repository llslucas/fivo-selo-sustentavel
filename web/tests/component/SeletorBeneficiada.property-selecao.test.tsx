// Teste de propriedade do componente apresentacional SeletorBeneficiada
// (web/src/components/campaign-wizard/SeletorBeneficiada.tsx).
//
// Task 5.4 — Registro da seleção via onChange.
//
// O componente é puramente apresentacional: recebe a lista de beneficiadas e o
// estado "carregado" por props e, ao clicar em um item (botão com role="option"
// e data-testid="beneficiada-item-<id>"), invoca onSelecionar(id) com o id da
// beneficiada clicada. Esta propriedade gera listas aleatórias, escolhe um item
// ao acaso, clica nele e afirma que onSelecionar foi chamado exatamente uma vez
// com o id daquela beneficiada. Nenhuma rede é tocada (componente sem fetch).

import { describe, it, expect, afterEach, vi } from "vitest";
import fc from "fast-check";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import SeletorBeneficiada from "@/components/campaign-wizard/SeletorBeneficiada";
import type { Beneficiada } from "@/services/instituicoes";

// Limpeza entre iterações da propriedade: cada execução monta e desmonta sua
// própria árvore, garantindo independência (o afterEach global também desmonta).
afterEach(() => {
  cleanup();
});

// Gerador de uma beneficiada com os campos do contrato preenchidos. O id é
// garantidamente não vazio para servir de chave e seletor estável.
const arbBeneficiada: fc.Arbitrary<Beneficiada> = fc.record({
  tipo: fc.constantFrom<Beneficiada["tipo"]>("INSTITUICAO", "CAUSA"),
  id: fc.uuid(),
  nome: fc.string({ minLength: 1, maxLength: 40 }),
  causa: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
  cidade: fc.option(fc.string({ maxLength: 20 }), { nil: null }),
  uf: fc.option(fc.string({ maxLength: 2 }), { nil: null }),
  descricao: fc.string({ maxLength: 60 }),
  site: fc.option(fc.webUrl(), { nil: null }),
  logoArquivoId: fc.option(fc.uuid(), { nil: null }),
});

// Lista de beneficiadas com ids únicos (o componente usa o id como chave e o
// seletor data-testid depende dele ser único para localizar o item clicado).
const arbListaComIdsUnicos: fc.Arbitrary<Beneficiada[]> = fc
  .uniqueArray(arbBeneficiada, {
    minLength: 1,
    maxLength: 12,
    selector: (b) => b.id,
  });

describe("SeletorBeneficiada — registro da seleção", () => {
  // Feature: catalogo-instituicoes-wizard, Property 9: Registro da seleção via onChange
  // Validates: Requirements 5.1
  it("Property 9: clicar em uma beneficiada invoca onSelecionar com o id daquela beneficiada", () => {
    fc.assert(
      fc.property(
        arbListaComIdsUnicos,
        // Índice do item a ser clicado, resolvido contra o tamanho da lista.
        fc.nat(),
        (beneficiadas, indiceBruto) => {
          const alvo = beneficiadas[indiceBruto % beneficiadas.length];
          const onSelecionar = vi.fn();

          const { getByTestId } = render(
            <ThemeProvider theme={theme}>
              <SeletorBeneficiada
                beneficiadas={beneficiadas}
                estado="carregado"
                termoBusca=""
                mensagemErro=""
                podeTentarNovamente={false}
                selecionadaId={null}
                onBuscar={() => {}}
                onTentarNovamente={() => {}}
                onSelecionar={onSelecionar}
              />
            </ThemeProvider>,
          );

          const item = getByTestId(`beneficiada-item-${alvo.id}`);
          fireEvent.click(item);

          // A seleção é registrada exatamente uma vez, com o id da beneficiada
          // clicada — e nada mais.
          expect(onSelecionar).toHaveBeenCalledTimes(1);
          expect(onSelecionar).toHaveBeenCalledWith(alvo.id);

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
