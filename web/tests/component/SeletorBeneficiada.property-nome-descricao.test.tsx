// Teste de propriedade do componente apresentacional `SeletorBeneficiada`
// (web/src/components/campaign-wizard/SeletorBeneficiada.tsx).
//
// Cobre a Task 5.3 — a propriedade de que, para qualquer lista de beneficiadas
// renderizada no estado "carregado", cada item exibido contém o `nome` e a
// `descricao` da beneficiada correspondente. Cada item é localizado pelo seu
// `data-testid="beneficiada-item-<id>"`, e a asserção verifica, dentro do
// elemento daquele item, a presença do texto de `nome` e de `descricao`.
//
// O componente usa MUI, então é renderizado dentro do ThemeProvider com o tema
// da aplicação, seguindo a convenção dos demais testes de componente. Nenhuma
// rede é exercitada: o componente é apresentacional e recebe os dados por props.

import { describe, it, expect, afterEach } from "vitest";
import { render, within, cleanup } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import fc from "fast-check";

import theme from "@/theme";
import type { Beneficiada } from "@/services/instituicoes";
import SeletorBeneficiada from "@/components/campaign-wizard/SeletorBeneficiada";

// Limpeza extra entre iterações da propriedade (o afterEach global também
// desmonta, mas garantimos DOM limpo entre renderizações internas).
afterEach(() => {
  cleanup();
});

// Texto exibível não vazio e sem espaços nas bordas/internos que colapsariam
// na normalização de whitespace do Testing Library. Gerado a partir de um
// alfabeto alfanumérico para que a comparação por texto do DOM seja estável e
// a unicidade da geração case com a unicidade percebida na renderização.
const arbTexto = fc
  .array(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")),
    { minLength: 1, maxLength: 20 },
  )
  .map((chars) => chars.join(""));

// Gera uma lista não vazia de beneficiadas. Para que a asserção de "nome e
// descrição presentes" por item seja inequívoca, cada texto exibido (nome e
// descrição de cada item) é único em toda a lista. Garantimos isso gerando um
// conjunto de textos distintos e particionando-os em pares (nome, descricao),
// de modo que nome != descricao dentro do item e não haja colisão entre itens.
const arbListaBeneficiadas = fc
  .uniqueArray(arbTexto, { minLength: 2, maxLength: 16 })
  // Mantém uma quantidade par de textos para formar pares completos.
  .map((textos) => (textos.length % 2 === 0 ? textos : textos.slice(0, -1)))
  .chain((textos) =>
    fc
      .tuple(
        ...Array.from({ length: textos.length / 2 }, (_, i) =>
          fc.constantFrom<Beneficiada["tipo"]>("INSTITUICAO", "CAUSA").map(
            (tipo): Beneficiada => ({
              tipo,
              id: `benef-${i}`,
              nome: textos[i * 2],
              causa: null,
              cidade: null,
              uf: null,
              descricao: textos[i * 2 + 1],
              site: null,
              logoArquivoId: null,
            }),
          ),
        ),
      )
      .map((itens) => itens as Beneficiada[]),
  );

describe("SeletorBeneficiada — nome e descrição por item (Task 5.3)", () => {
  // Feature: catalogo-instituicoes-wizard, Property 3: Nome e descrição presentes em cada item
  // Validates: Requirements 1.6
  it("Property 3: cada item renderizado contém o nome e a descrição da beneficiada", () => {
    fc.assert(
      fc.property(
        arbListaBeneficiadas,
        fc.constantFrom<"lista" | "cards">("lista", "cards"),
        (beneficiadas, variante) => {
          const { unmount } = render(
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

          try {
            for (const beneficiada of beneficiadas) {
              // Localiza o elemento do item pelo seu data-testid dedicado.
              const itemElemento = document.querySelector(
                `[data-testid="beneficiada-item-${beneficiada.id}"]`,
              );
              expect(itemElemento).not.toBeNull();

              // Dentro do item, o nome e a descrição devem estar presentes.
              const escopo = within(itemElemento as HTMLElement);
              expect(escopo.getByText(beneficiada.nome)).toBeInTheDocument();
              expect(escopo.getByText(beneficiada.descricao)).toBeInTheDocument();
            }
          } finally {
            unmount();
            cleanup();
          }
        },
      ),
      { numRuns: 10 },
    );
  });
});
