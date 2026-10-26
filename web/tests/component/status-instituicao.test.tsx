// Testes de componente da tela de status do cadastro da instituição
// (StatusCadastroInstituicao, rota /instituicao).
//
// Cobrem: mensagem de "em análise" com o botão de sair, controles visíveis em
// 320px, e logout chamando DELETE /sessoes/atual antes de ir para o login.
// Os estados aprovado/rejeitado já existem na estrutura, mas a página ainda só
// usa PENDENTE_APROVACAO (sem rota da API para a instituição ler o cadastro).

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import StatusCadastroInstituicao from "@/components/instituicao/StatusCadastroInstituicao";
import { APP_ROUTES } from "@/lib/routes";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";
import { definirViewport } from "../helpers/viewport";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/instituicao",
  useSearchParams: () => new URLSearchParams(),
}));

const MENSAGEM_EM_ANALISE = "Seu cadastro foi recebido e está em análise pela equipe";

let mock: MockFetch;

beforeEach(() => {
  push.mockClear();
  mock = instalarMockFetch();
  // O AuthProvider consulta GET /empresas/me ao montar; para uma instituição a
  // API não devolve empresa, e a tela não depende dessa resposta.
  mock.responderPara("/empresas/me", {
    status: 403,
    body: { statusCode: 403, message: "Acesso negado." },
  });
  mock.responderPara("/sessoes/atual", { status: 204 });
});

function renderizar(props?: React.ComponentProps<typeof StatusCadastroInstituicao>) {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <StatusCadastroInstituicao {...props} />
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe("StatusCadastroInstituicao", () => {
  it("mostra a mensagem de cadastro em análise e o botão de sair", () => {
    renderizar({ status: "PENDENTE_APROVACAO" });

    expect(screen.getByRole("heading", { name: "Cadastro em análise" })).toBeVisible();
    expect(screen.getByText(MENSAGEM_EM_ANALISE)).toBeVisible();
    expect(screen.getByRole("button", { name: /Sair da conta/ })).toBeVisible();
  });

  it("usa o estado em análise quando nenhum status é informado", () => {
    renderizar();

    expect(screen.getByText(MENSAGEM_EM_ANALISE)).toBeVisible();
  });

  it("mantém a mensagem e o botão visíveis em 320px", () => {
    definirViewport(320);
    renderizar();

    expect(screen.getByText(MENSAGEM_EM_ANALISE)).toBeVisible();
    expect(screen.getByRole("button", { name: /Sair da conta/ })).toBeVisible();
  });

  it("encerra a sessão e redireciona para o login ao sair", async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole("button", { name: /Sair da conta/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith(APP_ROUTES.public.login));
    const logout = mock.chamadas.find((c) => c.url.endsWith("/sessoes/atual"));
    expect(logout?.method).toBe("DELETE");
  });

  it("redireciona para o login mesmo se a chamada de logout falhar", async () => {
    mock.responderPara("/sessoes/atual", {
      status: 401,
      body: { statusCode: 401, message: "Não autenticado." },
    });
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole("button", { name: /Sair da conta/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith(APP_ROUTES.public.login));
  });

  it("mostra o motivo quando o cadastro foi rejeitado", () => {
    renderizar({ status: "REJEITADA", motivo: "Documento ilegível" });

    expect(screen.getByRole("heading", { name: "Cadastro rejeitado" })).toBeVisible();
    expect(screen.getByText("Documento ilegível")).toBeVisible();
  });
});
