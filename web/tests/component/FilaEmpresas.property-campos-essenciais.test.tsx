// Teste de propriedade dos campos essenciais por linha da fila de empresas
// (web/src/components/admin/FilaEmpresas.tsx).
//
// Cobre a Task 2.4 — para qualquer empresa pendente exibida, a linha
// correspondente deve conter a razão social, o CNPJ formatado via
// `formatarCnpj`, o e-mail e a data do cadastro via `toLocaleDateString("pt-BR")`.
//
// O serviço `@/services/admin` e `next/navigation` são mockados: o componente
// é montado no estado "carregado" com um único item aleatório e as asserções
// verificam, dentro da linha daquela empresa, a presença de cada campo.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, cleanup, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import fc from "fast-check";

import theme from "@/theme";
import { formatarCnpj } from "@/lib/mascaras";
import type { ItemFilaEmpresa } from "@/services/admin";

const listarFilaEmpresas = vi.fn();

vi.mock("@/services/admin", async () => {
  const real =
    await vi.importActual<typeof import("@/services/admin")>("@/services/admin");
  return {
    ...real,
    listarFilaEmpresas: () => listarFilaEmpresas(),
    aprovarEmpresa: vi.fn(() => Promise.resolve()),
    rejeitarEmpresa: vi.fn(() => Promise.resolve()),
  };
});

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

// Import após os mocks para que o componente use as versões mockadas.
import FilaEmpresas from "@/components/admin/FilaEmpresas";

// Texto exibível não vazio, sem espaços nas bordas (que colapsariam na
// normalização de whitespace do Testing Library) e sem dígitos — para que a
// razão social e o e-mail não colidam acidentalmente com o texto do CNPJ.
const arbTexto = fc
  .array(
    fc.constantFrom(
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    ),
    { minLength: 1, maxLength: 20 },
  )
  .map((chars) => chars.join(""));

// E-mail simples a partir de duas partes alfabéticas, garantindo um formato
// estável e livre de caracteres que atrapalhem a busca por texto.
const arbEmail = fc
  .tuple(arbTexto, arbTexto)
  .map(([usuario, dominio]) => `${usuario}@${dominio}.com`);

// 14 dígitos crus de CNPJ (a exibição aplica `formatarCnpj`).
const arbCnpj = fc
  .array(fc.constantFrom(..."0123456789".split("")), {
    minLength: 14,
    maxLength: 14,
  })
  .map((digitos) => digitos.join(""));

// Data de cadastro como ISO. Gera um timestamp inteiro dentro de um intervalo
// plausível e o converte para Date — abordagem segura que nunca produz uma data
// inválida (ao contrário de `fc.date()`, que pode gerar `Invalid Date` nos
// limites e fazer `.toISOString()` lançar `RangeError` durante a geração).
const arbCriadoEm = fc
  .integer({ min: Date.UTC(2000, 0, 1), max: Date.UTC(2100, 0, 1) })
  .map((t) => new Date(t).toISOString());

const arbItemFilaEmpresa = fc.record<ItemFilaEmpresa>({
  id: arbTexto.map((t) => `emp-${t}`),
  razaoSocial: arbTexto,
  cnpj: arbCnpj,
  email: arbEmail,
  criadoEm: arbCriadoEm,
});

beforeEach(() => {
  listarFilaEmpresas.mockReset();
});

afterEach(() => {
  cleanup();
});

function montar() {
  return render(
    <ThemeProvider theme={theme}>
      <FilaEmpresas />
    </ThemeProvider>,
  );
}

describe("FilaEmpresas — campos essenciais por linha (Task 2.4)", () => {
  // Feature: fila-empresas-pendentes-admin, Property 4: Cada linha exibe os dados essenciais da empresa
  // Validates: Requirements 5.3
  it("Property 4: cada linha exibe razão social, CNPJ formatado, e-mail e data do cadastro", async () => {
    await fc.assert(
      fc.asyncProperty(arbItemFilaEmpresa, async (item) => {
        listarFilaEmpresas.mockReset();
        listarFilaEmpresas.mockResolvedValue([item]);

        const { unmount } = montar();

        try {
          // A linha aparece após o carregamento assíncrono inicial.
          const titulo = await screen.findByText(item.razaoSocial);
          const linha = titulo.closest("li");
          expect(linha).not.toBeNull();

          const escopo = within(linha as HTMLElement);

          // Matcher que exige que a substring esteja no elemento-folha (nenhum
          // filho elemento contém o mesmo texto), evitando casar com os
          // ancestrais (`li`/`Stack`) que herdam o textContent.
          const contemNaFolha =
            (trecho: string) =>
            (_: string, el: Element | null): boolean => {
              if (el === null) return false;
              const proprioContem = (el.textContent ?? "").includes(trecho);
              const algumFilhoContem = Array.from(el.children).some((filho) =>
                (filho.textContent ?? "").includes(trecho),
              );
              return proprioContem && !algumFilhoContem;
            };

          // Razão social como título da linha.
          expect(escopo.getByText(item.razaoSocial)).toBeInTheDocument();

          // CNPJ formatado via formatarCnpj (o rótulo "CNPJ " precede o valor).
          const cnpjFormatado = formatarCnpj(item.cnpj);
          expect(escopo.getByText(contemNaFolha(cnpjFormatado))).toBeInTheDocument();

          // E-mail de contato.
          expect(escopo.getByText(item.email)).toBeInTheDocument();

          // Data do cadastro via toLocaleDateString("pt-BR").
          const dataFormatada = new Date(item.criadoEm).toLocaleDateString(
            "pt-BR",
          );
          expect(escopo.getByText(contemNaFolha(dataFormatada))).toBeInTheDocument();
        } finally {
          // Garante a conclusão do fetch pendente antes de desmontar, evitando
          // atualizações de estado fora de act entre as iterações.
          await waitFor(() => expect(listarFilaEmpresas).toHaveBeenCalled());
          unmount();
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
