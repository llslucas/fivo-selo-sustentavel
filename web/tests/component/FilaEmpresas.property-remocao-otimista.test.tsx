// Feature: fila-empresas-pendentes-admin, Property 1: Remoção otimista remove apenas a empresa decidida e preserva o restante
//
// Teste de propriedade da remoção otimista do componente `FilaEmpresas`
// (web/src/components/admin/FilaEmpresas.tsx).
//
// Property 1: Remoção otimista remove apenas a empresa decidida e preserva o restante.
// Validates: Requirements 7.4, 8.5
//
// Ao concluir com sucesso uma decisão (aprovar ou rejeitar) sobre uma empresa,
// o componente a remove da lista por filtro de `id`
// (`setItens((atuais) => atuais.filter((i) => i.id !== item.id))`). Esta
// propriedade exerce esse comportamento pela UI: para qualquer lista de
// empresas (ids únicos) e qualquer índice válido, decidimos sobre aquele item e
// verificamos que a lista renderizada passa a ser exatamente a lista original
// sem aquele item, preservando a ordem relativa dos demais e sem conter a
// empresa decidida.
//
// O serviço `@/services/admin` e `next/navigation` são mockados: `listarFilaEmpresas`
// resolve com a lista gerada e `aprovarEmpresa`/`rejeitarEmpresa` resolvem com
// sucesso, disparando a remoção otimista.

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  within,
  cleanup,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import fc from "fast-check";

import theme from "@/theme";
import type { ItemFilaEmpresa } from "@/services/admin";
import {
  listarFilaEmpresas,
  aprovarEmpresa,
  rejeitarEmpresa,
} from "@/services/admin";
import FilaEmpresas from "@/components/admin/FilaEmpresas";

// Cada iteração monta o componente, aguarda o carregamento assíncrono e
// executa uma interação de usuário; 100 iterações passam bem dos 5 s padrão.
vi.setConfig({ testTimeout: 120000 });

// Mocka o serviço de admin preservando os demais exports (MOTIVO_REJEICAO_MINIMO
// é usado pelo DialogoMotivoRejeicao). Controlamos apenas as três funções.
vi.mock("@/services/admin", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/services/admin")>();
  return {
    ...real,
    listarFilaEmpresas: vi.fn(),
    aprovarEmpresa: vi.fn(() => Promise.resolve()),
    rejeitarEmpresa: vi.fn(() => Promise.resolve()),
  };
});

// IMPORTANTE: `useRouter` deve devolver SEMPRE o MESMO objeto. A `FilaEmpresas`
// usa `carregar` num `useCallback([router])` disparado por `useEffect([carregar])`;
// se o mock criasse um router novo a cada render, `carregar` mudaria de
// identidade, o efeito re-executaria e re-buscaria a lista, re-inserindo o item
// removido pela remoção otimista. Um objeto estável reproduz o router real.
vi.mock("next/navigation", () => {
  const routerEstavel = {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  };
  return {
    useRouter: () => routerEstavel,
    usePathname: () => "/admin/empresas",
    useSearchParams: () => new URLSearchParams(),
  };
});

const listarFilaEmpresasMock = vi.mocked(listarFilaEmpresas);
const aprovarEmpresaMock = vi.mocked(aprovarEmpresa);
const rejeitarEmpresaMock = vi.mocked(rejeitarEmpresa);

afterEach(() => {
  cleanup();
  listarFilaEmpresasMock.mockReset();
  aprovarEmpresaMock.mockReset();
  rejeitarEmpresaMock.mockReset();
});

// Texto alfanumérico não vazio para id e razão social, mantendo a leitura do
// DOM estável. Razões sociais únicas na lista tornam a asserção de ordem por
// texto inequívoca.
const arbTexto = fc
  .array(
    fc.constantFrom(
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(""),
    ),
    { minLength: 1, maxLength: 20 },
  )
  .map((chars) => chars.join(""));

// `criadoEm` a partir de um timestamp inteiro seguro: evita a Invalid Date de
// `fc.date` nos limites (que lança RangeError em toISOString).
const arbCriadoEm = fc
  .integer({ min: Date.UTC(2000, 0, 1), max: Date.UTC(2100, 0, 1) })
  .map((t) => new Date(t).toISOString());

const arbEmpresa: fc.Arbitrary<ItemFilaEmpresa> = fc.record({
  id: arbTexto,
  razaoSocial: arbTexto,
  cnpj: fc.stringMatching(/^[0-9]{14}$/),
  email: fc.tuple(arbTexto, arbTexto).map(([u, d]) => `${u}@${d}.com`),
  criadoEm: arbCriadoEm,
});

// Lista não vazia com `id`s E razões sociais únicos: o `id` é a chave usada no
// filtro de remoção; a razão social é lida no DOM para asserir ordem/conteúdo.
const arbLista: fc.Arbitrary<ItemFilaEmpresa[]> = fc
  .uniqueArray(arbEmpresa, { selector: (e) => e.id, minLength: 1, maxLength: 8 })
  .filter(
    (lista) => new Set(lista.map((e) => e.razaoSocial)).size === lista.length,
  );

// Lê a sequência de razões sociais renderizadas (uma por linha, num h2) dentro
// de um escopo específico — o container daquela renderização —, evitando ler
// DOM remanescente de outras iterações.
function razoesRenderizadas(escopo: HTMLElement): string[] {
  return within(escopo)
    .queryAllByRole("heading", { level: 2 })
    .map((el) => el.textContent ?? "");
}

describe("FilaEmpresas — Property 1: remoção otimista preserva o restante", () => {
  // Feature: fila-empresas-pendentes-admin, Property 1: Remoção otimista remove apenas a empresa decidida e preserva o restante
  // Validates: Requirements 7.4, 8.5
  it("ao decidir com sucesso, a lista resultante é a original sem o item decidido, na mesma ordem", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbLista.chain((empresas) =>
          fc.record({
            empresas: fc.constant(empresas),
            indice: fc.integer({ min: 0, max: empresas.length - 1 }),
            aprovar: fc.boolean(),
          }),
        ),
        async ({ empresas, indice, aprovar }) => {
          // Começa limpando qualquer árvore/portal remanescente de iterações
          // anteriores e drenando microtasks pendentes, de modo que exista uma
          // única instância montada por iteração (os diálogos/Snackbar do MUI
          // vão para document.body via portal e poderiam vazar entre iterações).
          cleanup();
          await act(async () => {
            await Promise.resolve();
          });

          listarFilaEmpresasMock.mockReset();
          aprovarEmpresaMock.mockReset();
          rejeitarEmpresaMock.mockReset();
          listarFilaEmpresasMock.mockResolvedValue(empresas);
          aprovarEmpresaMock.mockResolvedValue(undefined);
          rejeitarEmpresaMock.mockResolvedValue(undefined);

          try {
            // `container` guarda a lista desta renderização; `baseElement`
            // inclui os portais (o diálogo do MUI monta em document.body). Ler
            // sempre dentro deste escopo isola a iteração de qualquer DOM
            // remanescente de outras. Usamos `fireEvent` (síncrono) em vez de
            // userEvent para manter 100 iterações rápidas e determinísticas.
            const { container, baseElement } = render(
              <ThemeProvider theme={theme}>
                <FilaEmpresas />
              </ThemeProvider>,
            );
            const emEscopo = within(baseElement);

            // Aguarda o carregamento terminar: todas as linhas aparecem.
            await waitFor(() =>
              expect(razoesRenderizadas(container)).toEqual(
                empresas.map((e) => e.razaoSocial),
              ),
            );

            const alvo = empresas[indice];
            const titulo = within(container).getByRole("heading", {
              level: 2,
              name: alvo.razaoSocial,
            });
            const linha = titulo.closest("li") as HTMLElement;

            if (aprovar) {
              // Abre o diálogo de confirmação e confirma a aprovação.
              const botaoAprovar = Array.from(
                linha.querySelectorAll("button"),
              ).find((b) => b.textContent === "Aprovar") as HTMLButtonElement;
              fireEvent.click(botaoAprovar);

              const dialogo = await emEscopo.findByRole("dialog");
              const confirmar = Array.from(
                dialogo.querySelectorAll("button"),
              ).find((b) => b.textContent === "Aprovar") as HTMLButtonElement;
              // `act` garante que as atualizações de estado da decisão (remoção
              // otimista + Snackbar) sejam aplicadas antes das asserções.
              await act(async () => {
                fireEvent.click(confirmar);
              });
            } else {
              // Abre o diálogo de rejeição, preenche motivo válido e envia.
              const botaoRejeitar = Array.from(
                linha.querySelectorAll("button"),
              ).find((b) => b.textContent === "Rejeitar") as HTMLButtonElement;
              fireEvent.click(botaoRejeitar);

              const dialogo = await emEscopo.findByRole("dialog");
              const campo = within(dialogo).getByLabelText(
                "Motivo da rejeição",
              ) as HTMLTextAreaElement;
              // Motivo com ≥20 caracteres após trim para passar na validação.
              fireEvent.change(campo, {
                target: {
                  value: "Motivo suficientemente longo para passar na validacao.",
                },
              });

              const form = campo.closest("form") as HTMLFormElement;
              await act(async () => {
                fireEvent.submit(form);
              });
            }

            // Garante que a decisão foi efetivamente enviada (a chamada ao
            // serviço aconteceu) antes de observar a remoção otimista.
            if (aprovar) {
              expect(aprovarEmpresaMock).toHaveBeenCalledWith(alvo.id);
            } else {
              expect(rejeitarEmpresaMock).toHaveBeenCalledWith(
                alvo.id,
                expect.any(String),
              );
            }

            const esperadas = empresas
              .filter((e) => e.id !== alvo.id)
              .map((e) => e.razaoSocial);

            // A remoção otimista produz exatamente a lista sem o item decidido,
            // preservando a ordem relativa dos demais.
            await waitFor(() =>
              expect(razoesRenderizadas(container)).toEqual(esperadas),
            );

            // A empresa decidida não aparece mais.
            expect(razoesRenderizadas(container)).not.toContain(
              alvo.razaoSocial,
            );
          } finally {
            cleanup();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
