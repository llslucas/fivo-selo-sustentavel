// Feature: seletor-causa-cadastro-instituicao, Property 1: Cada opção exibe nome e descrição
//
// Teste de propriedade do componente `SeletorCausa`
// (web/src/components/cadastro/SeletorCausa.tsx).
//
// Property 1: Cada opção exibe nome e descrição.
// Validates: Requirements 1.2
//
// Diferente do SeletorBeneficiada (apresentacional), o SeletorCausa é dono do
// próprio fetch: ao montar, chama listarCausasComTimeout() -> request("/causas").
// Por isso cada iteração instala o Mock_API (instalarMockFetch) e responde a
// "/causas" com a lista gerada, aguarda a transição carregando -> pronto, abre o
// select (MUI renderiza as opções num popover ao clicar na combobox) e verifica
// que cada opção renderizada contém o `nome` e a `descricao` da causa
// correspondente. O componente é montado dentro do ThemeProvider com o tema da
// aplicação, seguindo a convenção dos demais testes de componente.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, within, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import fc from "fast-check";

import theme from "@/theme";
import type { Causa } from "@/services/causas";
import SeletorCausa from "@/components/cadastro/SeletorCausa";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

// 100 iterações que montam o componente, aguardam o fetch assíncrono e abrem o
// popover do MUI por iteração levam bem mais que os 5 s padrão do runner.
vi.setConfig({ testTimeout: 120000 });

// Limpeza extra entre iterações da propriedade (o afterEach global também
// desmonta e restaura stubs, mas garantimos DOM limpo entre renderizações
// internas da mesma asserção fast-check).
afterEach(() => {
  cleanup();
});

// Texto exibível não vazio e sem espaços nas bordas/internos que colapsariam na
// normalização de whitespace do Testing Library. Alfabeto alfanumérico para que
// a comparação por texto do DOM seja estável e a unicidade gerada case com a
// unicidade percebida na renderização. Comprimento limitado a <=120 (nome) —
// reutilizado para descricao (que o contrato permite até 500), mantendo os
// textos curtos e distintos para asserção inequívoca.
const arbTexto = fc
  .array(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")),
    { minLength: 1, maxLength: 20 },
  )
  .map((chars) => chars.join(""));

// Gera uma lista NÃO vazia de causas (para o estado "pronto"), com:
// - `id` único em toda a lista (1..36 caracteres — aqui curto e distinto);
// - `nome` (1..120) e `descricao` (>=1 para ser assertável nesta propriedade:
//   o caso de descricao vazia é borda válida, mas não serve para validar
//   "exibe descrição").
// Para que a asserção de "nome e descrição presentes" por opção seja
// inequívoca, todos os textos exibidos (nomes e descrições de todas as causas)
// são únicos entre si: geramos um conjunto de textos distintos e os
// particionamos em pares (nome, descricao), com um id único por causa.
const arbListaCausas = fc
  .uniqueArray(arbTexto, { minLength: 2, maxLength: 16 })
  // Mantém uma quantidade par de textos para formar pares completos.
  .map((textos) => (textos.length % 2 === 0 ? textos : textos.slice(0, -1)))
  .map((textos): Causa[] =>
    Array.from({ length: textos.length / 2 }, (_, i) => ({
      id: `causa-${i}`,
      nome: textos[i * 2],
      descricao: textos[i * 2 + 1],
    })),
  );

describe("SeletorCausa — nome e descrição por opção (Task 2.6)", () => {
  // Feature: seletor-causa-cadastro-instituicao, Property 1: Cada opção exibe nome e descrição
  // Validates: Requirements 1.2
  it("Property 1: cada opção renderizada contém o nome e a descrição da causa", async () => {
    await fc.assert(
      fc.asyncProperty(arbListaCausas, async (causas) => {
        let mock: MockFetch | undefined;
        try {
          mock = instalarMockFetch();
          mock.responderPara("/causas", { status: 200, body: causas });

          const user = userEvent.setup({ delay: null });
          render(
            <ThemeProvider theme={theme}>
              <SeletorCausa
                value=""
                onChange={() => {}}
                label="Causa que a instituição defende"
              />
            </ThemeProvider>,
          );

          // Aguarda a transição carregando -> pronto: a combobox fica
          // habilitada quando a lista chega (no estado carregando o seletor
          // está desabilitado).
          const combobox = await screen.findByRole("combobox", {
            name: /Causa que a instituição defende/,
          });
          await waitFor(() => expect(combobox).not.toHaveAttribute("aria-disabled", "true"));

          // Abre o select: o MUI renderiza as opções num popover (role="listbox")
          // ao clicar na combobox.
          await user.click(combobox);
          const listbox = await screen.findByRole("listbox");

          // Cada causa deve aparecer como uma opção contendo o seu nome e a sua
          // descrição.
          const opcoes = within(listbox).getAllByRole("option");
          expect(opcoes).toHaveLength(causas.length);

          for (const causa of causas) {
            const opcao = opcoes.find((o) => o.getAttribute("data-value") === causa.id);
            expect(opcao).toBeDefined();
            const escopo = within(opcao as HTMLElement);
            expect(escopo.getByText(causa.nome)).toBeInTheDocument();
            expect(escopo.getByText(causa.descricao)).toBeInTheDocument();
          }
        } finally {
          cleanup();
          mock?.restaurar();
        }
      }),
      { numRuns: 100 },
    );
  });
});
