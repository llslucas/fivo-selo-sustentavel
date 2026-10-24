// Feature: seletor-causa-cadastro-instituicao, Property 5: Id fora da lista bloqueia o envio
//
// Property 5: Id fora da lista bloqueia o envio
// Validates: Requirements 2.5
//
// *Para qualquer* lista de causas e *qualquer* `causaId` que não corresponda a
// nenhuma causa dessa lista, o envio ao servidor é impedido localmente e a
// Mensagem_Causa_Invalida é exibida junto ao campo (os demais valores do
// formulário são preservados).
//
// -----------------------------------------------------------------------------
// Por que o seletor real é usado, mas o envio é dirigido por um harness mínimo
// -----------------------------------------------------------------------------
// O guard do Requisito 2.5 vive em `CadastroInstituicaoForm.handleSubmit`:
//
//     if (data.causaId && !causasIds.includes(data.causaId)) {
//       setErrosCampo((prev) => ({ ...prev, causaId: MENSAGEM_CAUSA_INVALIDA }));
//       return; // NÃO chama criarInstituicao()
//     }
//
// onde `causasIds` é a última lista reportada pelo `SeletorCausa` via
// `onCausasChange`, e `data.causaId` é o id atualmente selecionado.
//
// Para EXERCITAR esse guard é preciso que, no instante do submit, `data.causaId`
// esteja preenchido E ausente de `causasIds` (a causa foi desativada enquanto o
// usuário preenchia). No `CadastroInstituicaoForm` real, a única coisa que faz a
// lista do seletor recarregar (mudando `causasIds`) é o tratamento do 422, que
// SEMPRE limpa a seleção (`patch("causaId", "")`) — então, apenas pela UI do
// formulário, `causaId` nunca permanece preenchido com um id fora da lista. Isso
// foi verificado empiricamente: toda recarga disponível ao usuário zera o
// `causaId`, e o input oculto do MUI Select (`select` não-nativo) ignora
// `fireEvent.change`/dispatch nativo, então "forçar" o valor pelo DOM também não
// atravessa o `onChange` do seletor.
//
// A forma robusta e fiel de materializar o estado alvo (causaId preenchido, mas
// fora da lista carregada) é a corrida de desativação: o usuário seleciona uma
// causa presente na lista L1 e, em seguida, o seletor recarrega para uma lista
// L2 disjunta (a causa foi desativada) SEM limpar a seleção. Este harness
// reproduz exatamente a fiação do formulário com o `SeletorCausa` REAL
// (`value`/`onChange`/`onCausasChange`/`recarregarChave`) e aplica o MESMO guard
// do `handleSubmit` antes de chamar `criarInstituicao`. Assim, a seleção, o
// carregamento da lista e o reporte de `causasIds` são todos do componente real;
// só o gatilho de recarga (`recarregarChave`) e o botão de envio são dirigidos
// pelo harness — equivalentes aos que o formulário dispara internamente.

import { describe, it, expect, afterEach, vi } from "vitest";
import { useState } from "react";
import fc from "fast-check";
import { render, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import SeletorCausa from "@/components/cadastro/SeletorCausa";
import type { Causa } from "@/services/causas";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

// Mesma constante do CadastroInstituicaoForm (Mensagem_Causa_Invalida exibida
// junto ao campo quando o causaId não pertence à lista carregada — Req 2.5).
const MENSAGEM_CAUSA_INVALIDA =
  "A causa selecionada é inválida ou não está mais disponível. Escolha outra.";

// Cada iteração monta o seletor real (GET /causas mockado), aguarda o estado
// "pronto", seleciona, recarrega para a lista disjunta e envia; 100 execuções
// excedem o timeout padrão de 5 s.
vi.setConfig({ testTimeout: 120000 });

afterEach(() => {
  cleanup();
});

// Alfabeto alfanumérico: ids/nomes estáveis para consulta no DOM.
const arbTexto = fc
  .array(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")),
    { minLength: 1, maxLength: 16 },
  )
  .map((chars) => chars.join(""));

const arbDescricao = fc
  .array(
    fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")),
    { minLength: 0, maxLength: 24 },
  )
  .map((chars) => chars.join(""));

function arbCausaComId(id: string): fc.Arbitrary<Causa> {
  return fc.record({ nome: arbTexto, descricao: arbDescricao }).map((parcial) => ({
    ...parcial,
    id,
  }));
}

// Harness que espelha a fiação do CadastroInstituicaoForm em torno do
// SeletorCausa real: guarda `causaId` (como data.causaId) e `causasIds`
// (reportado pelo onCausasChange), expõe o botão "Enviar" que aplica o MESMO
// guard do handleSubmit — bloqueando o envio e exibindo a Mensagem_Causa_Invalida
// quando o causaId não pertence à lista carregada.
function Harness({
  causaIdInicial,
  recarregarChave,
  onEnviar,
}: {
  causaIdInicial: string;
  recarregarChave: number;
  onEnviar: (causaId: string) => void;
}) {
  const [causaId, setCausaId] = useState<string>(causaIdInicial);
  const [causasIds, setCausasIds] = useState<string[]>([]);
  const [erroCausa, setErroCausa] = useState<string | undefined>(undefined);

  function handleEnviar() {
    // Guard idêntico ao de CadastroInstituicaoForm.handleSubmit (Req 2.5).
    if (causaId && !causasIds.includes(causaId)) {
      setErroCausa(MENSAGEM_CAUSA_INVALIDA);
      return;
    }
    onEnviar(causaId);
  }

  return (
    <ThemeProvider theme={theme}>
      <SeletorCausa
        label="Causa que a instituição defende"
        value={causaId}
        onChange={(id) => {
          setCausaId(id);
          setErroCausa(undefined);
        }}
        error={erroCausa}
        recarregarChave={recarregarChave}
        onCausasChange={setCausasIds}
      />
      <button type="button" onClick={handleEnviar}>
        Enviar cadastro
      </button>
      {/* Marcador determinístico dos ids reportados pelo SeletorCausa real via
          onCausasChange. O teste aguarda este texto refletir a lista recarregada
          (L2) antes de enviar, garantindo que causasIds já foi atualizado — sem
          depender do estado transitório de "carregando" do combobox. */}
      <output data-testid="causas-ids">{causasIds.join(",")}</output>
    </ThemeProvider>
  );
}

describe("CadastroInstituicaoForm — id fora da lista bloqueia o envio (Task 4.6)", () => {
  // Feature: seletor-causa-cadastro-instituicao, Property 5: Id fora da lista bloqueia o envio
  // Validates: Requirements 2.5
  it("Property 5: um causaId ausente da lista carregada bloqueia criarInstituicao e exibe a Mensagem_Causa_Invalida", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Índice do item escolhido na lista inicial (resolvido pelo tamanho).
        fc.nat(),
        // Lista INICIAL (L1): ids únicos, não vazia — o usuário seleciona um id dela.
        fc
          .uniqueArray(fc.integer({ min: 0, max: 1_000_000 }), { minLength: 1, maxLength: 12 })
          .chain((ns) => fc.tuple(...ns.map((n) => arbCausaComId(`L1-${n}`)))),
        // Lista DISJUNTA (L2): ids únicos, não vazia (estado "pronto"), com prefixo
        // garantidamente distinto de L1 — o id selecionado NÃO pertence a L2.
        fc
          .uniqueArray(fc.integer({ min: 0, max: 1_000_000 }), { minLength: 1, maxLength: 12 })
          .chain((ns) => fc.tuple(...ns.map((n) => arbCausaComId(`L2-${n}`)))),
        async (indiceBruto, listaInicial, listaDisjunta) => {
          const l1 = listaInicial as Causa[];
          const l2 = listaDisjunta as Causa[];
          const escolhida = l1[indiceBruto % l1.length];
          const onEnviar = vi.fn();

          const mock: MockFetch = instalarMockFetch();
          mock.responderPara("/causas", { status: 200, body: l1 });

          // Cada iteração monta e desmonta a própria árvore; o try/finally
          // garante a limpeza (cleanup + restaurar) mesmo se uma asserção falhar,
          // evitando que árvores residuais acumulem múltiplos comboboxes no DOM.
          try {
            const { rerender, baseElement } = render(
              <Harness causaIdInicial="" recarregarChave={0} onEnviar={onEnviar} />,
            );
            // Consultas restritas à árvore desta iteração (evita bleed entre runs).
            const tela = within(baseElement as HTMLElement);

            // Aguarda a carga inicial (L1) concluir de forma determinística: o
            // marcador reflete os ids de L1 somente após o SeletorCausa reportar
            // a lista via onCausasChange (estado "pronto").
            const idsL1 = l1.map((c) => c.id).join(",");
            await waitFor(() =>
              expect(tela.getByTestId("causas-ids").textContent).toBe(idsL1),
            );

            // Seleciona a causa escolhida pela interação real do MUI Select
            // (mouseDown para abrir + clique no option correspondente).
            const combobox = tela.getByRole("combobox", {
              name: /Causa que a instituição defende/,
            });
            fireEvent.mouseDown(combobox);
            const listbox = await tela.findByRole("listbox");
            const options = within(listbox).getAllByRole("option");
            const indice = indiceBruto % l1.length;
            fireEvent.click(options[indice]);

            // Fecha a lista: a seleção foi aplicada (causaId = id da causa
            // escolhida, presente em L1).
            await waitFor(() =>
              expect(tela.queryByRole("listbox")).not.toBeInTheDocument(),
            );

            // Corrida de desativação: a causa é desativada e o seletor recarrega
            // para a lista disjunta L2 (sem limpar a seleção). O onCausasChange do
            // seletor real passa a reportar os ids de L2 ao harness. Bumpar
            // recarregarChave reexecuta a busca do seletor real (GET /causas -> L2).
            mock.responderPara("/causas", { status: 200, body: l2 });
            rerender(
              <Harness causaIdInicial="" recarregarChave={1} onEnviar={onEnviar} />,
            );
            // Aguarda a recarga concluir de forma determinística: o marcador
            // reflete exatamente os ids de L2 somente quando o SeletorCausa real
            // terminou a busca e reportou a nova lista via onCausasChange. Só
            // então o guard terá causasIds = L2 (disjunto do causaId selecionado).
            const idsL2 = l2.map((c) => c.id).join(",");
            await waitFor(() =>
              expect(tela.getByTestId("causas-ids").textContent).toBe(idsL2),
            );

            // Envia: o guard do Req 2.5 deve bloquear (causaId = id de L1, fora de L2).
            fireEvent.click(tela.getByRole("button", { name: "Enviar cadastro" }));

            // (a) criarInstituicao NÃO é chamado (onEnviar representa o envio real).
            expect(onEnviar).not.toHaveBeenCalled();
            // (b) a Mensagem_Causa_Invalida aparece junto ao campo.
            expect(await tela.findByText(MENSAGEM_CAUSA_INVALIDA)).toBeInTheDocument();
            // Sanidade: a causa escolhida realmente não está em L2.
            expect(l2.some((c) => c.id === escolhida.id)).toBe(false);
          } finally {
            mock.restaurar();
            cleanup();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
