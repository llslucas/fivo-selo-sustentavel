// Feature: seletor-causa-cadastro-instituicao, Property 2: Renderização fiel à lista recebida
//
// Teste de propriedade do componente `SeletorCausa`
// (web/src/components/cadastro/SeletorCausa.tsx).
//
// Property 2: Renderização fiel à lista recebida (ordem e pertencimento).
// Validates: Requirements 1.3, 1.4
//
// O SeletorCausa é dono do próprio fetch: ao montar, chama
// listarCausasComTimeout() -> request("/causas"). Por isso cada iteração instala
// o Mock_API (instalarMockFetch) e responde a "/causas" com a lista gerada,
// aguarda a transição carregando -> pronto, abre o select (MUI renderiza as
// opções num popover role="listbox" ao clicar na combobox) e lê a sequência de
// `id`s renderizados pelos atributos data-value dos li[role=option] (o MUI
// define data-value com o value do MenuItem, que é o id da causa).
//
// A propriedade afirma igualdade ESTRITA de sequência: a ordem dos `id`s
// renderizados é exatamente a da lista recebida (sem reordenar/filtrar — 1.3) e
// nenhum `id` fora da lista aparece, nem há acréscimos ou remoções (1.4). O
// componente é montado dentro do ThemeProvider com o tema da aplicação,
// seguindo a convenção dos demais testes de componente.

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

// Texto exibível não vazio, de alfabeto alfanumérico, para que a renderização e
// a consulta ao DOM fiquem estáveis. Usado para `nome` (contrato 1..120).
const arbTexto = fc
  .array(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")),
    { minLength: 1, maxLength: 20 },
  )
  .map((chars) => chars.join(""));

// `descricao` pode ser vazia (contrato 0..500) — aqui não a asseguramos, então
// permitimos string eventualmente vazia (reusa o alfabeto alfanumérico).
const arbDescricao = fc
  .array(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")),
    { minLength: 0, maxLength: 20 },
  )
  .map((chars) => chars.join(""));

// `id` alfanumérico único (1..36 do contrato), gerado como string estável para
// o atributo data-value do MenuItem. Mantemos curto e distinto para asserção.
const arbId = fc
  .array(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")),
    { minLength: 1, maxLength: 12 },
  )
  .map((chars) => chars.join(""));

const arbCausa: fc.Arbitrary<Causa> = fc.record({
  id: arbId,
  nome: arbTexto,
  descricao: arbDescricao,
});

// Lista NÃO vazia (estado "pronto") de causas com `id`s ÚNICOS (1..36 itens).
const arbListaCausas: fc.Arbitrary<Causa[]> = fc.uniqueArray(arbCausa, {
  selector: (c) => c.id,
  minLength: 1,
  maxLength: 36,
});

describe("SeletorCausa — renderização fiel à lista (Task 2.7)", () => {
  // Feature: seletor-causa-cadastro-instituicao, Property 2: Renderização fiel à lista recebida
  // Validates: Requirements 1.3, 1.4
  it("Property 2: a sequência de ids renderizados é exatamente a da lista recebida", async () => {
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

          // Aguarda carregando -> pronto: a combobox fica habilitada quando a
          // lista chega (no estado carregando o seletor está desabilitado).
          const combobox = await screen.findByRole("combobox", {
            name: /Causa que a instituição defende/,
          });
          await waitFor(() =>
            expect(combobox).not.toHaveAttribute("aria-disabled", "true"),
          );

          // Abre o select: o MUI renderiza as opções num popover (role="listbox").
          await user.click(combobox);
          const listbox = await screen.findByRole("listbox");

          // Sequência de ids renderizados, em ordem de DOM, lida do data-value
          // de cada li[role=option] (o MUI define data-value = value do MenuItem).
          const opcoes = within(listbox).getAllByRole("option");
          const idsRenderizados = opcoes.map((o) => o.getAttribute("data-value"));

          const idsEsperados = causas.map((c) => c.id);

          // Igualdade estrita de sequência: ordem, inclusão e exclusão idênticas
          // (sem reordenar/filtrar — 1.3; sem acréscimos nem remoções — 1.4).
          expect(idsRenderizados).toEqual(idsEsperados);

          // Nenhum id fora da lista recebida aparece renderizado (pertencimento).
          const conjuntoEsperado = new Set(idsEsperados);
          for (const id of idsRenderizados) {
            expect(id).not.toBeNull();
            expect(conjuntoEsperado.has(id as string)).toBe(true);
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
