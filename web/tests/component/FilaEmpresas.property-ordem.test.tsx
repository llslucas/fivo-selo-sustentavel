// Feature: fila-empresas-pendentes-admin, Property 3: A fila renderiza as empresas na ordem recebida
//
// Teste de propriedade do componente `FilaEmpresas`
// (web/src/components/admin/FilaEmpresas.tsx).
//
// Property 3: A fila renderiza as empresas na ordem recebida.
// Validates: Requirements 5.4
//
// A FilaEmpresas é dona do próprio carregamento: ao montar, chama
// listarFilaEmpresas() do serviço `@/services/admin`. Por isso mockamos esse
// módulo (preservando os demais exports) e fazemos `listarFilaEmpresas`
// resolver com a lista gerada a cada iteração. `next/navigation` também é
// mockado porque o componente usa `useRouter`.
//
// Para cada lista aleatória de `ItemFilaEmpresa` (com `id`s únicos), montamos o
// componente, aguardamos o carregamento terminar e lemos a sequência de razões
// sociais no DOM pela ordem dos títulos de linha (cada linha renderiza a razão
// social num Typography component="h2"). A propriedade afirma igualdade ESTRITA
// de sequência: a ordem das razões sociais renderizadas é exatamente a ordem da
// lista recebida (sem reordenar, filtrar, acrescentar ou remover).

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import fc from "fast-check";

import theme from "@/theme";
import type { ItemFilaEmpresa } from "@/services/admin";
import { listarFilaEmpresas } from "@/services/admin";
import FilaEmpresas from "@/components/admin/FilaEmpresas";

// 100 iterações que montam o componente e aguardam o carregamento assíncrono
// por iteração levam bem mais que os 5 s padrão do runner.
vi.setConfig({ testTimeout: 120000 });

// Mocka o serviço de admin preservando os demais exports (o componente também
// importa aprovarEmpresa/rejeitarEmpresa). Só `listarFilaEmpresas` é controlada.
vi.mock("@/services/admin", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/services/admin")>();
  return { ...real, listarFilaEmpresas: vi.fn() };
});

// A FilaEmpresas usa useRouter; mockamos next/navigation como nos demais testes.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/admin/empresas",
  useSearchParams: () => new URLSearchParams(),
}));

const listarFilaEmpresasMock = vi.mocked(listarFilaEmpresas);

afterEach(() => {
  cleanup();
  listarFilaEmpresasMock.mockReset();
});

// Texto exibível não vazio (alfanumérico) para a razão social, mantendo a
// consulta ao DOM estável. Usamos razões sociais únicas na lista para que a
// asserção de ordem por texto seja inequívoca.
const arbRazaoSocial = fc
  .array(
    fc.constantFrom(
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(""),
    ),
    { minLength: 1, maxLength: 24 },
  )
  .map((chars) => chars.join(""));

const arbId = fc
  .array(
    fc.constantFrom(
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(""),
    ),
    { minLength: 1, maxLength: 12 },
  )
  .map((chars) => chars.join(""));

const arbEmpresa: fc.Arbitrary<ItemFilaEmpresa> = fc.record({
  id: arbId,
  razaoSocial: arbRazaoSocial,
  cnpj: fc.stringMatching(/^[0-9]{14}$/),
  email: fc
    .tuple(arbRazaoSocial, arbRazaoSocial)
    .map(([u, d]) => `${u}@${d}.com`),
  // Timestamp inteiro convertido para Date — abordagem segura que nunca produz
  // uma data inválida (ao contrário de `fc.date()`, que pode gerar `Invalid
  // Date` nos limites e fazer `.toISOString()` lançar `RangeError` durante a
  // geração).
  criadoEm: fc
    .integer({ min: Date.UTC(2000, 0, 1), max: Date.UTC(2100, 0, 1) })
    .map((t) => new Date(t).toISOString()),
});

// Lista NÃO vazia com `id`s E razões sociais únicos: o `id` é a chave de
// renderização e a razão social é lida no DOM para asserir a ordem.
const arbListaEmpresas: fc.Arbitrary<ItemFilaEmpresa[]> = fc
  .uniqueArray(arbEmpresa, {
    selector: (e) => e.id,
    minLength: 1,
    maxLength: 12,
  })
  .filter(
    (lista) => new Set(lista.map((e) => e.razaoSocial)).size === lista.length,
  );

describe("FilaEmpresas — Property 3: renderiza as empresas na ordem recebida", () => {
  // Feature: fila-empresas-pendentes-admin, Property 3: A fila renderiza as empresas na ordem recebida
  // Validates: Requirements 5.4
  it("a sequência de razões sociais no DOM é exatamente a ordem da lista recebida", async () => {
    await fc.assert(
      fc.asyncProperty(arbListaEmpresas, async (empresas) => {
        try {
          listarFilaEmpresasMock.mockResolvedValue(empresas);

          render(
            <ThemeProvider theme={theme}>
              <FilaEmpresas />
            </ThemeProvider>,
          );

          // Aguarda o carregamento terminar: a primeira razão social aparece.
          await waitFor(() =>
            expect(
              screen.getByRole("heading", {
                level: 2,
                name: empresas[0].razaoSocial,
              }),
            ).toBeInTheDocument(),
          );

          // Cada linha renderiza a razão social num heading de nível 2 (h2), em
          // ordem de DOM. Lemos a sequência renderizada.
          const titulos = screen.getAllByRole("heading", { level: 2 });
          const renderizadas = titulos.map((el) => el.textContent);

          const esperadas = empresas.map((e) => e.razaoSocial);

          // Igualdade estrita de sequência: ordem, inclusão e exclusão idênticas.
          expect(renderizadas).toEqual(esperadas);
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
