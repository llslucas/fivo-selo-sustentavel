// Feature: seletor-causa-cadastro-instituicao, Property 3: Seleção emite o id correspondente
//
// Property 3: Seleção emite o id correspondente
// Validates: Requirements 2.1
//
// Para qualquer lista não vazia de causas e qualquer causa escolhida nela,
// selecionar essa causa no SeletorCausa chama onChange com exatamente o id
// daquela causa. O componente, no estado "pronto", renderiza um MUI
// `TextField select`: abrir o combobox e clicar no option do índice escolhido
// dispara o onChange do TextField com o `value` do MenuItem, que é o id da
// causa daquele índice. A lista é entregue ao componente via mock de HTTP
// (GET /causas) e o estado "pronto" é aguardado antes de abrir o seletor.
//
// A interação usa fireEvent (mouseDown para abrir o select MUI, click no
// option) de forma síncrona, como os testes de propriedade de referência
// (SeletorBeneficiada.*). userEvent, com seus atrasos de ponteiro por evento,
// torna 100 iterações inviáveis em tempo de teste.

import { describe, it, expect, afterEach, vi } from "vitest";
import fc from "fast-check";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import SeletorCausa from "@/components/cadastro/SeletorCausa";
import type { Causa } from "@/services/causas";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

// Cada iteração busca as causas (GET /causas mockado) e aguarda o estado
// "pronto"; 10 execuções levam mais que o timeout padrão de 5 s.
vi.setConfig({ testTimeout: 120000 });

// Cada iteração monta e desmonta a própria árvore; o afterEach global também
// desmonta, mas limpamos aqui para garantir independência entre runs.
afterEach(() => {
  cleanup();
});

// Gerador de uma causa com os campos do contrato: id 1..36, nome 1..120,
// descricao 0..500 (Requisito 7.2).
const arbCausa: fc.Arbitrary<Causa> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 36 }),
  nome: fc.string({ minLength: 1, maxLength: 120 }),
  descricao: fc.string({ minLength: 0, maxLength: 500 }),
});

// Lista NÃO vazia com ids únicos: o id é a chave do MenuItem e o valor emitido
// por onChange, então precisa ser único para a asserção ser inequívoca.
const arbListaNaoVazia: fc.Arbitrary<Causa[]> = fc.uniqueArray(arbCausa, {
  minLength: 1,
  maxLength: 36,
  selector: (c) => c.id,
});

describe("SeletorCausa — seleção emite o id correspondente", () => {
  // Feature: seletor-causa-cadastro-instituicao, Property 3: Seleção emite o id correspondente
  // Validates: Requirements 2.1
  it("Property 3: selecionar uma causa chama onChange com o id daquela causa", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbListaNaoVazia,
        // Índice do item a ser selecionado, resolvido contra o tamanho da lista.
        fc.nat(),
        async (causas, indiceBruto) => {
          const alvo = causas[indiceBruto % causas.length];
          const onChange = vi.fn();

          // Mock de HTTP por iteração: GET /causas responde a lista gerada.
          const mock: MockFetch = instalarMockFetch();
          mock.responderPara("/causas", { status: 200, body: causas });

          render(
            <ThemeProvider theme={theme}>
              <SeletorCausa
                value=""
                onChange={onChange}
                label="Causa que a instituição defende"
              />
            </ThemeProvider>,
          );

          // Aguarda o estado "pronto": o combobox do TextField select habilitado.
          const combobox = await screen.findByRole("combobox", {
            name: /Causa que a instituição defende/,
          });

          // Abre o seletor MUI (mouseDown no combobox) e aguarda o listbox.
          fireEvent.mouseDown(combobox);
          await screen.findByRole("listbox");

          // Os options são renderizados na ordem da lista recebida (o front não
          // reordena). Localiza o option pelo índice escolhido e clica nele.
          const indice = indiceBruto % causas.length;
          const options = screen.getAllByRole("option");
          expect(options).toHaveLength(causas.length);
          fireEvent.click(options[indice]);

          // onChange é chamado com exatamente o id da causa escolhida.
          await waitFor(() => {
            expect(onChange).toHaveBeenCalledWith(alvo.id);
          });

          mock.restaurar();
          cleanup();
        },
      ),
      { numRuns: 10 },
    );
  });
});
