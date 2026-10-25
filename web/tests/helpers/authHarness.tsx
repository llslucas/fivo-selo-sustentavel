// Harness de autenticação para testes de componente/integração (web/).
//
// Monta o `AuthProvider` real (web/src/contexts/AuthContext.tsx) com o tema MUI
// da aplicação e um `fetch` controlado pelo Mock_API, e expõe utilidades para
// dirigir e observar as transições de estado da sessão
// (`carregando` → `autenticado` | `nao-autenticado` | `expirada`).
//
// Pontos cobertos (Requisitos 4.1–4.5, 4.7):
// - O `AuthProvider` dispara `verificar()` (GET /empresas/me) ao montar; o
//   harness permite configurar a resposta inicial do /empresas/me antes de
//   montar (opts.respostaInicialMe) para exercitar cada estado.
// - Para `expirada`, a resposta inicial é um sucesso e uma reconsulta posterior
//   falha: o `jaAutenticouAntes` do provedor passa a distinguir `expirada` de
//   `nao-autenticado`. O helper `simularExpiracao()` orquestra essa sequência.
// - Um componente sonda (`EstadoProbe`) consome o AuthContext e renderiza o
//   estado atual e os dados da empresa em nós com papéis/testids acessíveis,
//   permitindo asserção estável a partir do DOM.
// - `next/navigation` (`useRouter`, `redirect`) é mockado para capturar
//   redirecionamentos sem navegação real; os spies ficam acessíveis via
//   `spiesNavegacao` para asserção nos testes de guarda de rota.

import { useContext, useLayoutEffect } from "react";
import { render, type RenderResult } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { vi } from "vitest";

import theme from "@/theme";
import {
  AuthContext,
  AuthProvider,
  type AuthContextValue,
  type EstadoSessao,
} from "@/contexts/AuthContext";
import type { EmpresaAtual } from "@/services/empresas";
import { instalarMockFetch, type RespostaSimulada } from "./mockFetch";

// Mock de next/navigation. Esta chamada é içada (hoisted) pelo Vitest para o
// topo de qualquer arquivo de teste que importe este harness, de modo que
// componentes de guarda de rota (que chamam useRouter/redirect) usem os spies
// em vez de navegar de verdade. Os spies são recriados pelo afterEach global
// (vi.restoreAllMocks) e reexpostos abaixo em `spiesNavegacao`.
const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};
const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  redirect: redirectMock,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

// Spies de navegação, para asserção de redirecionamentos capturados nos testes.
export const spiesNavegacao = {
  router: routerMock,
  redirect: redirectMock,
};

export type AuthHarness = {
  // Renderiza AuthProvider envolvendo children, com tema MUI aplicado.
  render(children: React.ReactNode): RenderResult;
  // Estado de sessão corrente, lido do AuthContext montado.
  estadoAtual(): EstadoSessao;
  // Empresa corrente (ou null), lida do AuthContext montado.
  empresaAtual(): EmpresaAtual | null;
  // Reconsulta o contexto (equivale a um login seguido de verificar()): aplica
  // uma nova resposta para GET /empresas/me e dispara verificar(). Útil para a
  // sequência sucesso→falha que produz `expirada`.
  reconsultarCom(resposta: RespostaSimulada): Promise<void>;
  // Atalho da sequência sucesso→falha: a resposta inicial já autenticou; esta
  // chamada força a reconsulta a falhar, levando o estado a `expirada`.
  simularExpiracao(resposta?: RespostaSimulada): Promise<void>;
  // Mock_API subjacente, para configurar respostas e inspecionar chamadas.
  mock: ReturnType<typeof instalarMockFetch>;
};

// Captura o valor do AuthContext num ref mutável, para leitura imperativa fora
// do ciclo de render (estadoAtual/empresaAtual) sem acoplar a asserção à sonda.
function criarCaptura() {
  const ref: { valor: AuthContextValue | null } = { valor: null };
  return ref;
}

// Componente sonda: lê o AuthContext e renderiza o estado atual e a empresa em
// nós com testids acessíveis, permitindo asserção estável a partir do DOM.
function EstadoProbe({
  aoCapturar,
}: {
  aoCapturar: (contexto: AuthContextValue | null) => void;
}) {
  const contexto = useContext(AuthContext);
  // Publica no commit (não durante o render): a leitura imperativa acontece
  // depois do act(), quando os layout effects já rodaram.
  useLayoutEffect(() => {
    aoCapturar(contexto);
  });

  if (!contexto) {
    // Fora de um AuthProvider — não deveria acontecer no harness.
    return <div data-testid="auth-sem-provedor">sem-provedor</div>;
  }

  return (
    <div data-testid="auth-probe">
      <span data-testid="auth-estado">{contexto.estado}</span>
      <span data-testid="auth-empresa-id">{contexto.empresa?.id ?? ""}</span>
      <span data-testid="auth-empresa-razao-social">
        {contexto.empresa?.razaoSocial ?? ""}
      </span>
    </div>
  );
}

export function montarAuth(opts?: {
  respostaInicialMe?: RespostaSimulada;
}): AuthHarness {
  const mock = instalarMockFetch();
  const captura = criarCaptura();

  // Resposta inicial do GET /empresas/me (disparado no mount do AuthProvider).
  // Default: 401, que — sem autenticação prévia — leva a `nao-autenticado`.
  const respostaInicial: RespostaSimulada = opts?.respostaInicialMe ?? {
    status: 401,
    body: { statusCode: 401, message: "Não autenticado." },
  };
  mock.responderPara("/empresas/me", respostaInicial);

  function lerContexto(): AuthContextValue {
    if (!captura.valor) {
      throw new Error(
        "authHarness: o AuthContext ainda não foi capturado. " +
          "Chame harness.render(...) e aguarde a montagem antes de ler o estado.",
      );
    }
    return captura.valor;
  }

  return {
    render(children: React.ReactNode): RenderResult {
      return render(
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <EstadoProbe
              aoCapturar={(contexto) => {
                captura.valor = contexto;
              }}
            />
            {children}
          </AuthProvider>
        </ThemeProvider>,
      );
    },
    estadoAtual(): EstadoSessao {
      return lerContexto().estado;
    },
    empresaAtual(): EmpresaAtual | null {
      return lerContexto().empresa;
    },
    async reconsultarCom(resposta: RespostaSimulada): Promise<void> {
      mock.responderPara("/empresas/me", resposta);
      await lerContexto().verificar();
    },
    async simularExpiracao(resposta?: RespostaSimulada): Promise<void> {
      // A sessão prévia já autenticou (respostaInicialMe de sucesso); agora a
      // reconsulta falha, e o provedor marca `expirada` por `jaAutenticouAntes`.
      await this.reconsultarCom(
        resposta ?? {
          status: 401,
          body: { statusCode: 401, message: "Sessão expirada." },
        },
      );
    },
    mock,
  };
}
