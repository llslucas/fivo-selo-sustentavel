// Testes de componente do login por papel (F10): rota inicial de cada papel,
// papel guardado no sessionStorage pelo AuthContext e proteção de rota por
// papel no AuthGuard.
//
// O AuthProvider real é montado com o tema MUI e o fetch controlado pelo
// Mock_API (instalarMockFetch). `next/navigation` é mockado para capturar os
// redirecionamentos do AuthGuard sem navegação real.

import { useContext, useEffect } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import { AuthContext, AuthProvider, type AuthContextValue } from "@/contexts/AuthContext";
import AuthGuard from "@/components/layout/AuthGuard";
import { rotaInicialDoPapel } from "@/lib/routes";
import type { EmpresaAtual } from "@/services/empresas";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

const navegacao = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navegacao.push,
    replace: navegacao.replace,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  redirect: vi.fn(),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

const CHAVE_PAPEL = "fivo_papel";

const empresaFixture: EmpresaAtual = {
  id: "empresa-123",
  razaoSocial: "Empresa Sustentável LTDA",
  nomeFantasia: "EcoMarca",
  cnpj: "12345678000190",
  email: "contato@ecomarca.com.br",
  emailPendente: null,
  telefone: "11999998888",
  cep: "01001000",
  logradouro: "Praça da Sé",
  numero: "100",
  complemento: null,
  bairro: "Sé",
  cidade: "São Paulo",
  uf: "SP",
  site: null,
  contato: "Maria Silva",
  status: "ATIVA",
  logoArquivoId: null,
  criadoEm: "2024-01-10T12:00:00.000Z",
};

const respostaNaoAutenticado = {
  status: 401,
  body: { statusCode: 401, message: "Não autenticado." },
};

// Sonda que expõe o estado/papel no DOM e entrega o contexto ao teste por
// callback, depois de cada render.
function Sonda({ aoAtualizar }: { aoAtualizar?: (contexto: AuthContextValue) => void }) {
  const contexto = useContext(AuthContext);
  useEffect(() => {
    if (contexto) aoAtualizar?.(contexto);
  });
  return (
    <div>
      <span data-testid="estado">{contexto?.estado}</span>
      <span data-testid="papel">{contexto?.papel ?? ""}</span>
    </div>
  );
}

let mock: MockFetch;

function chamadasEmpresasMe() {
  return mock.chamadas.filter((c) => c.method === "GET" && c.url.endsWith("/empresas/me"));
}

function montar(filhos: React.ReactNode = null) {
  let contexto: AuthContextValue | null = null;
  render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <Sonda
          aoAtualizar={(c) => {
            contexto = c;
          }}
        />
        {filhos}
      </AuthProvider>
    </ThemeProvider>,
  );
  return {
    contexto(): AuthContextValue {
      if (!contexto) throw new Error("AuthContext ainda não foi capturado.");
      return contexto;
    },
  };
}

async function aguardarEstado(estado: string) {
  await waitFor(() => {
    expect(screen.getByTestId("estado")).toHaveTextContent(estado);
  });
}

beforeEach(() => {
  window.sessionStorage.clear();
  navegacao.push.mockClear();
  navegacao.replace.mockClear();
  mock = instalarMockFetch();
});

afterEach(() => {
  mock.restaurar();
  window.sessionStorage.clear();
});

describe("rotaInicialDoPapel", () => {
  it("leva cada papel para a sua área", () => {
    expect(rotaInicialDoPapel("EMPRESA")).toBe("/dashboard");
    expect(rotaInicialDoPapel("ADMIN")).toBe("/admin");
    expect(rotaInicialDoPapel("INSTITUICAO")).toBe("/instituicao");
  });
});

describe("AuthContext — papel da sessão", () => {
  it('entrar("ADMIN") autentica sem chamar GET /empresas/me', async () => {
    mock.responderPara("/empresas/me", respostaNaoAutenticado);
    const auth = montar();
    await aguardarEstado("nao-autenticado");
    const chamadasAntes = chamadasEmpresasMe().length;

    await act(async () => {
      await auth.contexto().entrar("ADMIN");
    });

    await aguardarEstado("autenticado");
    expect(screen.getByTestId("papel")).toHaveTextContent("ADMIN");
    expect(chamadasEmpresasMe()).toHaveLength(chamadasAntes);
    expect(window.sessionStorage.getItem(CHAVE_PAPEL)).toBe("ADMIN");
  });

  it('entrar("EMPRESA") consulta GET /empresas/me', async () => {
    mock.responderPara("/empresas/me", respostaNaoAutenticado);
    const auth = montar();
    await aguardarEstado("nao-autenticado");
    const chamadasAntes = chamadasEmpresasMe().length;

    mock.responderPara("/empresas/me", { status: 200, body: empresaFixture });
    await act(async () => {
      await auth.contexto().entrar("EMPRESA");
    });

    await aguardarEstado("autenticado");
    expect(screen.getByTestId("papel")).toHaveTextContent("EMPRESA");
    expect(chamadasEmpresasMe()).toHaveLength(chamadasAntes + 1);
    expect(auth.contexto().empresa).toEqual(empresaFixture);
    expect(window.sessionStorage.getItem(CHAVE_PAPEL)).toBe("EMPRESA");
  });

  it("com ADMIN salvo, autentica ao montar sem chamar GET /empresas/me", async () => {
    window.sessionStorage.setItem(CHAVE_PAPEL, "ADMIN");
    montar();

    await aguardarEstado("autenticado");
    expect(screen.getByTestId("papel")).toHaveTextContent("ADMIN");
    expect(chamadasEmpresasMe()).toHaveLength(0);
  });

  it("logout limpa o papel", async () => {
    window.sessionStorage.setItem(CHAVE_PAPEL, "ADMIN");
    mock.responderPara("/sessoes/atual", { status: 204 });
    const auth = montar();
    await aguardarEstado("autenticado");

    await act(async () => {
      await auth.contexto().logout();
    });

    await aguardarEstado("nao-autenticado");
    expect(screen.getByTestId("papel")).toHaveTextContent("");
    expect(window.sessionStorage.getItem(CHAVE_PAPEL)).toBeNull();
  });

  it("sessão de empresa expirada limpa o papel", async () => {
    mock.responderPara("/empresas/me", { status: 200, body: empresaFixture });
    const auth = montar();
    await aguardarEstado("autenticado");
    expect(window.sessionStorage.getItem(CHAVE_PAPEL)).toBe("EMPRESA");

    mock.responderPara("/empresas/me", respostaNaoAutenticado);
    await act(async () => {
      await auth.contexto().verificar();
    });

    await aguardarEstado("expirada");
    expect(screen.getByTestId("papel")).toHaveTextContent("");
    expect(window.sessionStorage.getItem(CHAVE_PAPEL)).toBeNull();
  });
});

describe("AuthGuard — proteção por papel", () => {
  it("mostra o conteúdo para o papel certo", async () => {
    window.sessionStorage.setItem(CHAVE_PAPEL, "ADMIN");
    montar(
      <AuthGuard papel="ADMIN">
        <div data-testid="conteudo">área do admin</div>
      </AuthGuard>,
    );

    expect(await screen.findByTestId("conteudo")).toBeInTheDocument();
    expect(navegacao.replace).not.toHaveBeenCalled();
  });

  it("empresa abrindo a área de ADMIN vai para /dashboard", async () => {
    mock.responderPara("/empresas/me", { status: 200, body: empresaFixture });
    montar(
      <AuthGuard papel="ADMIN">
        <div data-testid="conteudo">área do admin</div>
      </AuthGuard>,
    );

    await aguardarEstado("autenticado");
    await waitFor(() => {
      expect(navegacao.replace).toHaveBeenCalledWith("/dashboard");
    });
    expect(screen.queryByTestId("conteudo")).not.toBeInTheDocument();
  });

  it("admin abrindo a área de EMPRESA vai para /admin", async () => {
    window.sessionStorage.setItem(CHAVE_PAPEL, "ADMIN");
    montar(
      <AuthGuard papel="EMPRESA">
        <div data-testid="conteudo">área da empresa</div>
      </AuthGuard>,
    );

    await aguardarEstado("autenticado");
    await waitFor(() => {
      expect(navegacao.replace).toHaveBeenCalledWith("/admin");
    });
    expect(screen.queryByTestId("conteudo")).not.toBeInTheDocument();
  });

  it("sem sessão vai para /login", async () => {
    mock.responderPara("/empresas/me", respostaNaoAutenticado);
    montar(
      <AuthGuard papel="ADMIN">
        <div data-testid="conteudo">área do admin</div>
      </AuthGuard>,
    );

    await aguardarEstado("nao-autenticado");
    await waitFor(() => {
      expect(navegacao.replace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByTestId("conteudo")).not.toBeInTheDocument();
  });
});
