// Testes do botão "Ver documento" da fila de instituições (F5)
// (web/src/components/admin/FilaInstituicoes.tsx).
//
// O fetch é stubado aqui mesmo, e não pelo Mock_API, porque o download do
// documento lê a resposta como Blob, que o Mock_API não simula.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import FilaInstituicoes from "@/components/admin/FilaInstituicoes";
import type { ItemFilaInstituicao } from "@/services/admin";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/instituicoes",
  useSearchParams: () => new URLSearchParams(),
}));

function item(parcial: Partial<ItemFilaInstituicao> = {}): ItemFilaInstituicao {
  return {
    id: "inst-1",
    razaoSocial: "Instituto Verde",
    cnpj: "11222333000181",
    causa: "Meio ambiente",
    cidade: "Campinas",
    uf: "SP",
    email: "contato@verde.org",
    criadoEm: "2026-10-20T12:00:00.000Z",
    documentoArquivoId: "arq-1",
    documentoDisponivel: true,
    cnpjCoincideComEmpresa: false,
    ...parcial,
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Responde a fila com `itens` e o documento com `documento`.
function stubFetch(itens: ItemFilaInstituicao[], documento: () => Response) {
  const fetchStub = vi.fn<typeof fetch>((input) => {
    const url = String(input);
    if (url.endsWith("/admin/instituicoes")) return Promise.resolve(json(200, itens));
    if (url.includes("/arquivos/")) return Promise.resolve(documento());
    return Promise.reject(new Error(`URL inesperada: ${url}`));
  });
  vi.stubGlobal("fetch", fetchStub);
  return fetchStub;
}

function abaFalsa() {
  const aba = { location: { href: "" }, close: vi.fn() };
  vi.spyOn(window, "open").mockReturnValue(aba as unknown as Window);
  return aba;
}

function montar() {
  return render(
    <ThemeProvider theme={theme}>
      <FilaInstituicoes />
    </ThemeProvider>,
  );
}

async function acoes() {
  return within(await screen.findByTestId("acoes-instituicao"));
}

beforeEach(() => {
  replace.mockClear();
  // jsdom não implementa URL.createObjectURL.
  vi.stubGlobal(
    "URL",
    class extends URL {
      static createObjectURL = vi.fn(() => "blob:documento");
      static revokeObjectURL = vi.fn();
    },
  );
});

describe("FilaInstituicoes — ver documento (F5)", () => {
  it.each([
    ["PDF", "application/pdf"],
    ["imagem", "image/png"],
  ])("abre o documento (%s) numa aba nova com a sessão do admin", async (_nome, tipo) => {
    const fetchStub = stubFetch([item()], () =>
      // O Response nativo não aceita o Blob do jsdom; basta o que o service lê.
      ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": tipo }),
        blob: () => Promise.resolve(new Blob(["conteudo"], { type: tipo })),
      }) as unknown as Response,
    );
    const aba = abaFalsa();
    montar();

    await userEvent.click((await acoes()).getByRole("button", { name: "Ver documento" }));

    await waitFor(() => expect(aba.location.href).toBe("blob:documento"));
    expect(window.open).toHaveBeenCalledWith("", "_blank");
    const [url, init] = fetchStub.mock.calls.find(([u]) => String(u).includes("/arquivos/"))!;
    expect(String(url)).toBe("/api/arquivos/arq-1");
    expect(init?.credentials).toBe("include");
    expect(aba.close).not.toHaveBeenCalled();
  });

  it("com documento indisponível, desabilita o botão e avisa que a aprovação será recusada", async () => {
    stubFetch([item({ documentoDisponivel: false })], () => json(500, {}));
    montar();

    const botao = (await acoes()).getByRole("button", { name: "Documento indisponível" });
    expect(botao).toBeDisabled();
    expect(screen.getByTestId("documento-indisponivel")).toHaveTextContent(
      "a aprovação será recusada",
    );
  });

  it.each([
    [403, "Você não tem permissão para ver este documento."],
    [404, "Documento não encontrado."],
  ])("com %i, fecha a aba e mostra mensagem clara", async (status, mensagem) => {
    stubFetch([item()], () => json(status, { statusCode: status, message: "x" }));
    const aba = abaFalsa();
    montar();

    await userEvent.click((await acoes()).getByRole("button", { name: "Ver documento" }));

    expect(await screen.findByText(mensagem)).toBeInTheDocument();
    expect(aba.close).toHaveBeenCalled();
  });

  it("com 401, fecha a aba e manda para o login", async () => {
    stubFetch([item()], () => json(401, { statusCode: 401, message: "x" }));
    const aba = abaFalsa();
    montar();

    await userEvent.click((await acoes()).getByRole("button", { name: "Ver documento" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(aba.close).toHaveBeenCalled();
  });
});
