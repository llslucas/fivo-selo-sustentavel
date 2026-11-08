// Testes da página /confirmar-email, destino do link do e-mail de troca de
// e-mail. O fetch é interceptado pelo Mock_API; nenhuma chamada sai da máquina.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

let parametros = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => parametros,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/confirmar-email",
}));

import ConfirmarEmailPage from "@/app/confirmar-email/page";
import { isPublicRoute } from "@/lib/routes";

let api: MockFetch;

function montar(token: string | null) {
  parametros = new URLSearchParams(token === null ? "" : { token });
  return render(
    <ThemeProvider theme={theme}>
      <ConfirmarEmailPage />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  api = instalarMockFetch();
});

afterEach(() => {
  api.restaurar();
});

describe("/confirmar-email", () => {
  it("é rota pública", () => {
    expect(isPublicRoute("/confirmar-email")).toBe(true);
  });

  it("não confirma nada só por abrir a página", () => {
    montar("tok-1");

    expect(screen.getByRole("button", { name: "Confirmar novo e-mail" })).toBeInTheDocument();
    expect(api.chamadas).toHaveLength(0);
  });

  it("envia o token do link ao confirmar e mostra o sucesso", async () => {
    api.responderPara("/api/empresas/me/email/confirmacao", { status: 204 });
    montar("tok-1");

    await userEvent.click(screen.getByRole("button", { name: "Confirmar novo e-mail" }));

    expect(await screen.findByText(/Novo e-mail confirmado/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para o login" })).toHaveAttribute("href", "/login");
    const chamada = api.ultimaChamada();
    expect(chamada.method).toBe("POST");
    expect(chamada.url).toBe("/api/empresas/me/email/confirmacao");
    expect(JSON.parse(String(chamada.body))).toEqual({ token: "tok-1" });
  });

  it("mostra link inválido sem token, sem chamar a API", () => {
    montar(null);

    expect(screen.getByText(/link de confirmação é inválido ou expirou/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar novo e-mail" })).not.toBeInTheDocument();
    expect(api.chamadas).toHaveLength(0);
  });

  it("mostra link inválido quando a API recusa o token (400)", async () => {
    api.responderPara("/api/empresas/me/email/confirmacao", {
      status: 400,
      body: { statusCode: 400, message: "Link de confirmação inválido ou expirado" },
    });
    montar("tok-velho");

    await userEvent.click(screen.getByRole("button", { name: "Confirmar novo e-mail" }));

    expect(await screen.findByText(/link de confirmação é inválido ou expirou/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar novo e-mail" })).not.toBeInTheDocument();
  });

  it("avisa quando o novo e-mail já pertence a outra conta (409)", async () => {
    api.responderPara("/api/empresas/me/email/confirmacao", {
      status: 409,
      body: { statusCode: 409, message: "E-mail já cadastrado" },
    });
    montar("tok-1");

    await userEvent.click(screen.getByRole("button", { name: "Confirmar novo e-mail" }));

    expect(await screen.findByText(/já está cadastrado em outra conta/)).toBeInTheDocument();
  });

  it("deixa tentar de novo quando o servidor falha", async () => {
    api.responderPara("/api/empresas/me/email/confirmacao", {
      status: 503,
      body: { statusCode: 503, message: "Service Unavailable" },
    });
    montar("tok-1");

    await userEvent.click(screen.getByRole("button", { name: "Confirmar novo e-mail" }));

    expect(await screen.findByText(/servidor está indisponível/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Confirmar novo e-mail" })).toBeEnabled(),
    );
  });
});
