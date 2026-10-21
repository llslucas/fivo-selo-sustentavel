// Teste de propriedade do componente apresentacional SeletorBeneficiada
// (web/src/components/campaign-wizard/SeletorBeneficiada.tsx).
//
// Feature: catalogo-instituicoes-wizard, Property 2: Itens renderizados
// correspondem à lista recebida, na ordem.
// Validates: Requirements 1.3, 3.4
//
// Gera listas aleatórias de beneficiadas e afirma que, no estado "carregado", a
// sequência de itens renderizados (role="option" / data-testid
// "beneficiada-item-<id>") é exatamente igual à lista recebida — sem acréscimos,
// remoções nem reordenações. Exercitado em ambas as variantes ("lista" e
// "cards"), com no mínimo 100 iterações.

import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import fc from "fast-check";

import theme from "@/theme";
import SeletorBeneficiada from "@/components/campaign-wizard/SeletorBeneficiada";
import type { Beneficiada, TipoBeneficiada } from "@/services/instituicoes";

afterEach(() => {
  cleanup();
});

// Gerador de uma beneficiada válida com `id` único (garantido no gerador da
// lista via `uniqueArray` por `id`, já que a marcação/renderização usa o `id`).
const tipoArb: fc.Arbitrary<TipoBeneficiada> = fc.constantFrom(
  "INSTITUICAO",
  "CAUSA",
);

const beneficiadaArb: fc.Arbitrary<Beneficiada> = fc.record({
  tipo: tipoArb,
  id: fc.string({ minLength: 1, maxLength: 24 }).filter((s) => s.trim().length > 0),
  nome: fc.string({ minLength: 1, maxLength: 60 }).filter((s) => s.trim().length > 0),
  causa: fc.option(fc.string({ maxLength: 40 }), { nil: null }),
  cidade: fc.option(fc.string({ maxLength: 40 }), { nil: null }),
  uf: fc.option(fc.string({ maxLength: 2 }), { nil: null }),
  descricao: fc.string({ maxLength: 120 }),
  site: fc.option(fc.webUrl(), { nil: null }),
  logoArquivoId: fc.option(fc.string({ maxLength: 24 }), { nil: null }),
});

// Lista com ids únicos (o componente usa `id` como chave e no data-testid).
const listaArb: fc.Arbitrary<Beneficiada[]> = fc.uniqueArray(beneficiadaArb, {
  selector: (b) => b.id,
  minLength: 0,
  maxLength: 12,
});

const varianteArb = fc.constantFrom<"lista" | "cards">("lista", "cards");

function renderSeletor(beneficiadas: Beneficiada[], variante: "lista" | "cards") {
  return render(
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
        onSelecionar={() => {}}
        variante={variante}
      />
    </ThemeProvider>,
  );
}

describe("SeletorBeneficiada — Property 2: itens renderizados na ordem recebida", () => {
  it("renderiza exatamente a lista recebida, preservando a ordem", () => {
    fc.assert(
      fc.property(listaArb, varianteArb, (beneficiadas, variante) => {
        const { container } = renderSeletor(beneficiadas, variante);

        try {
          const idsEsperados = beneficiadas.map((b) => b.id);

          // Sequência de itens renderizados em ordem de DOM.
          const itensRenderizados = Array.from(
            container.querySelectorAll<HTMLElement>('[role="option"]'),
          );

          // Mesma quantidade: sem acréscimos nem remoções.
          expect(itensRenderizados).toHaveLength(idsEsperados.length);

          // Extrai o id de cada item pelo data-testid "beneficiada-item-<id>".
          const idsRenderizados = itensRenderizados.map((el) => {
            const testId = el.getAttribute("data-testid") ?? "";
            return testId.replace(/^beneficiada-item-/, "");
          });

          // Igualdade estrita de sequência: ordem, inclusão e exclusão idênticas.
          expect(idsRenderizados).toEqual(idsEsperados);

          // Cada item expõe o nome (aria-label) da beneficiada correspondente,
          // reforçando que não houve troca/reordenação de conteúdo.
          itensRenderizados.forEach((el, indice) => {
            expect(el).toHaveAttribute("aria-label", beneficiadas[indice].nome);
          });
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
