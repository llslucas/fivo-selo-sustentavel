// Feature: fila-empresas-pendentes-admin, Property 2: Motivo abaixo do mínimo nunca é enviado
//
// Teste de propriedade do componente compartilhado `DialogoMotivoRejeicao`
// (web/src/components/admin/DialogoMotivoRejeicao.tsx), reusado pela fila de
// empresas pendentes do admin.
//
// Property 2: Motivo abaixo do mínimo nunca é enviado.
// Validates: Requirements 8.2
//
// Para toda string cujo comprimento após `trim` seja menor que
// MOTIVO_REJEICAO_MINIMO (20) — incluindo vazias, só espaços e cauda/começo de
// espaços — ao preencher o campo e submeter a rejeição, o diálogo NÃO deve
// acionar `onConfirmar` (ou seja, `rejeitarEmpresa` nunca é chamada) e deve
// exibir a validação de tamanho mínimo.
//
// O componente é apresentacional e não faz fetch; ainda assim é montado dentro
// do ThemeProvider com o tema da aplicação, seguindo a convenção dos demais
// testes de componente. Usamos userEvent para digitar o motivo e submeter.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import fc from "fast-check";

import theme from "@/theme";
import DialogoMotivoRejeicao from "@/components/admin/DialogoMotivoRejeicao";
import { MOTIVO_REJEICAO_MINIMO } from "@/services/admin";

// 100 iterações que montam o diálogo, digitam no campo e submetem por iteração
// levam bem mais que os 5 s padrão do runner.
vi.setConfig({ testTimeout: 120000 });

// Limpeza extra entre iterações da propriedade (o afterEach global também
// desmonta e restaura stubs, mas garantimos DOM limpo entre renderizações
// internas da mesma asserção fast-check).
afterEach(() => {
  cleanup();
});

// Alfabeto visível (não-espaço) para o "núcleo" do motivo. Evita caracteres de
// controle e mantém a digitação do userEvent estável; `{` e `[` seriam
// interpretados como teclas especiais pelo userEvent, então ficam de fora.
const CARACTERES_VISIVEIS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:!?-_()@#$%&*+=/".split("");

// Núcleo sem espaços nas pontas, com 0..(MINIMO-1) caracteres visíveis: garante
// que, após `trim`, o comprimento fique estritamente abaixo do mínimo.
const arbNucleoCurto = fc
  .array(fc.constantFrom(...CARACTERES_VISIVEIS), {
    minLength: 0,
    maxLength: MOTIVO_REJEICAO_MINIMO - 1,
  })
  .map((chars) => chars.join(""));

// Espaços em branco (espaço comum) para as extremidades: estes somem no `trim`,
// então não contam para o comprimento efetivo. Usamos o espaço comum, que o
// userEvent digita como caractere literal.
const arbEspacos = fc
  .array(fc.constant(" "), { minLength: 0, maxLength: 6 })
  .map((chars) => chars.join(""));

// Motivo final = espaços à esquerda + núcleo curto + espaços à direita.
// Invariante garantida por construção: motivo.trim().length < MINIMO. Cobre os
// casos vazio ("" sem núcleo e sem espaços), só-espaços (núcleo vazio + espaços)
// e cauda/começo de espaços (núcleo não vazio + espaços).
const arbMotivoCurto = fc
  .tuple(arbEspacos, arbNucleoCurto, arbEspacos)
  .map(([esquerda, nucleo, direita]) => `${esquerda}${nucleo}${direita}`)
  .filter((motivo) => motivo.trim().length < MOTIVO_REJEICAO_MINIMO);

describe("DialogoMotivoRejeicao — motivo abaixo do mínimo (Task 2.8)", () => {
  // Feature: fila-empresas-pendentes-admin, Property 2: Motivo abaixo do mínimo nunca é enviado
  // Validates: Requirements 8.2
  it("Property 2: motivo com trim < mínimo não aciona onConfirmar e mostra a validação", async () => {
    await fc.assert(
      fc.asyncProperty(arbMotivoCurto, async (motivo) => {
        try {
          const onConfirmar = vi.fn();
          const onCancelar = vi.fn();
          const user = userEvent.setup({ delay: null });

          render(
            <ThemeProvider theme={theme}>
              <DialogoMotivoRejeicao
                open
                titulo="Rejeitar empresa"
                descricao="Explique por que a empresa não foi aprovada."
                enviando={false}
                erro={null}
                onCancelar={onCancelar}
                onConfirmar={onConfirmar}
              />
            </ThemeProvider>,
          );

          const campo = screen.getByLabelText(/Motivo da rejeição/);

          // Preenche o campo com o motivo curto. Strings vazias tornam o `type`
          // um no-op (o campo permanece vazio), o que também é um caso válido.
          // O alfabeto e os espaços gerados não contêm os caracteres especiais
          // de teclado do userEvent (`{` e `[`), então o texto entra literalmente.
          await user.clear(campo);
          if (motivo.length > 0) {
            await user.type(campo, motivo);
          }

          // Submete a rejeição clicando no botão de ação do diálogo.
          const botaoRejeitar = screen.getByRole("button", { name: /^Rejeitar$/ });
          await user.click(botaoRejeitar);

          // Núcleo da propriedade: motivo abaixo do mínimo nunca é enviado.
          expect(onConfirmar).not.toHaveBeenCalled();

          // E a validação de tamanho mínimo deve aparecer após a tentativa.
          const validacao = await screen.findByText(
            new RegExp(`no mínimo ${MOTIVO_REJEICAO_MINIMO} caracteres`),
          );
          expect(validacao).toBeInTheDocument();
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
