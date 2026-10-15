// Testes de integração dos estados de UI frente às respostas da API (web/).
//
// Cobre a Task 11.1 (Requisitos 6.1–6.6): como as telas reagem a uma requisição
// pendente (loader), a uma listagem vazia, a um 401 (encerra sessão e vai para
// autenticação), a um erro de validação por campo (associa mensagens e preserva
// valores), a `fieldErrors` de campos não exibidos (erro geral) e a uma falha de
// rede (mensagem de conexão + ação de nova tentativa).
//
// Estratégia de alvos (conforme o design — "estados de UI" cobertos por exemplos
// de integração):
//   • 6.4 e 6.5 usam COMPONENTES REAIS do app — `CadastroWizard` (associação de
//     mensagens a campos, preservação de valores e Alert de erro geral com a
//     mensagem retornada). É o alvo fiel para validação por campo e erro geral.
//   • 6.1, 6.2, 6.3 e 6.6 são estados de uma TELA DE LISTAGEM. Hoje não existe um
//     componente de listagem real conduzido pelo cliente `request` (o
//     `DashboardView` renderiza dados estáticos de exemplo, sem loading/empty/erro
//     reais, e os serviços de instituições/campanhas/comprovantes ainda não
//     existem — tasks futuras). Por isso, 6.1/6.2/6.3/6.6 são verificados contra
//     um HARNESS INLINE representativo (`ListagemHarness` / `ListagemProtegida`)
//     que segue o MESMO padrão: busca via o `request` REAL de @/services/api,
//     mostra loader enquanto pendente, estado vazio para 0 itens, erro em falha,
//     botão de nova tentativa e, no caso protegido, encerra a sessão local
//     (logout()) e redireciona para a autenticação ao receber 401. Isso é aceito
//     pela abordagem de integração do design enquanto a tela real não existe.
//
// Infra compartilhada: `instalarMockFetch` conduz as respostas; `next/navigation`
// é mockado neste arquivo para capturar redirecionamentos (6.3); tudo é montado
// sob o `ThemeProvider` do MUI (e `AuthProvider` real onde o fluxo usa a sessão).

import { useEffect, useState, useCallback } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

import theme from "@/theme";
import { ApiError, request } from "@/services/api";
import { logout as logoutRequest } from "@/services/auth";
import CadastroWizard from "@/components/cadastro/CadastroWizard";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";

// ──────────────────────────────────────────────────────────────────────────
// Mock de next/navigation (içado para o topo pelo Vitest). Expõe spies de
// `useRouter().push/replace` e de `redirect` para capturar o redirecionamento
// para a autenticação sem navegação real (necessário para o Requisito 6.3).
// ──────────────────────────────────────────────────────────────────────────
// Os spies são criados dentro de vi.hoisted para ficarem disponíveis quando a
// fábrica de vi.mock (içada ao topo do arquivo) referenciá-los.
const { routerMock, redirectMock } = vi.hoisted(() => ({
  routerMock: {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  },
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  redirect: redirectMock,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: vi.fn(),
}));

// Rota de autenticação usada pelo harness protegido (6.3). Mantida inline para
// não acoplar o teste a detalhes de configuração externos.
const ROTA_LOGIN = "/login";

// ──────────────────────────────────────────────────────────────────────────
// Harness inline representativo de uma tela de listagem conduzida pelo cliente
// `request` real. Usado para 6.1 (loader), 6.2 (vazio) e 6.6 (erro de rede +
// nova tentativa) — estados de UI de listagem para os quais ainda não há uma
// tela real do app.
// ──────────────────────────────────────────────────────────────────────────
type Item = { id: string; nome: string };

function ListagemHarness() {
  const [carregando, setCarregando] = useState(true);
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erroRede, setErroRede] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErroRede(null);
    try {
      const dados = await request<Item[]>("/itens");
      setItens(dados);
    } catch (e) {
      // Erro de rede do cliente vem como ApiError(0, ...). Mostramos a mensagem
      // de falha de conexão e deixamos os dados ausentes.
      if (e instanceof ApiError && e.status === 0) {
        setErroRede(e.message);
      } else if (e instanceof ApiError) {
        setErroRede(e.message);
      } else {
        setErroRede("Não foi possível carregar.");
      }
      setItens(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void buscar();
  }, [buscar]);

  // Enquanto pendente: só o loader; dados/vazio/erro ficam ocultos (6.1).
  if (carregando) {
    return (
      <Box data-testid="estado-carregando" sx={{ p: 2 }}>
        <CircularProgress aria-label="Carregando" role="progressbar" />
      </Box>
    );
  }

  // Falha de rede: mensagem de conexão + ação de nova tentativa (6.6).
  if (erroRede) {
    return (
      <Box data-testid="estado-erro" sx={{ p: 2 }}>
        <Alert severity="error">{erroRede}</Alert>
        <Button data-testid="botao-nova-tentativa" onClick={() => void buscar()}>
          Tentar novamente
        </Button>
      </Box>
    );
  }

  // Lista vazia: mensagem orientativa, sem loader (6.2).
  if (itens !== null && itens.length === 0) {
    return (
      <Box data-testid="estado-vazio" sx={{ p: 2 }}>
        <Typography>Nenhum item cadastrado ainda. Crie o primeiro.</Typography>
      </Box>
    );
  }

  // Dados presentes.
  return (
    <Box data-testid="estado-dados" sx={{ p: 2 }}>
      <ul>
        {(itens ?? []).map((item) => (
          <li key={item.id}>{item.nome}</li>
        ))}
      </ul>
    </Box>
  );
}

// Harness inline de uma listagem protegida: ao receber 401, encerra a sessão
// local (logout()) e redireciona para a autenticação (6.3). Reproduz o padrão
// esperado de uma área privada do app.
function ListagemProtegida() {
  const [carregando, setCarregando] = useState(true);
  const [itens, setItens] = useState<Item[] | null>(null);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const dados = await request<Item[]>("/privado/itens");
        if (ativo) setItens(dados);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          // Encerra a sessão local e direciona para a tela de autenticação.
          await logoutRequest().catch(() => undefined);
          routerMock.replace(ROTA_LOGIN);
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return <div data-testid="protegida-carregando">carregando</div>;
  }
  return (
    <div data-testid="protegida-conteudo">
      {(itens ?? []).map((i) => (
        <span key={i.id}>{i.nome}</span>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Infraestrutura de montagem
// ──────────────────────────────────────────────────────────────────────────
let mock: MockFetch;

beforeEach(() => {
  mock = instalarMockFetch();
});

afterEach(() => {
  mock.restaurar();
});

function renderizarComTema(ui: React.ReactNode) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// Preenche a etapa 1 do CadastroWizard com dados válidos para destravar o
// avanço, deixando a confirmação de senha igual à senha.
async function preencherEtapa1(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(
    screen.getByRole("textbox", { name: /Razão social/i }),
    "Empresa Verde LTDA",
  );
  await usuario.type(
    screen.getByRole("textbox", { name: /Nome fantasia/i }),
    "EcoMarca",
  );
  await usuario.type(screen.getByRole("textbox", { name: /CNPJ/i }), "12345678000190");
  await usuario.type(screen.getByRole("textbox", { name: /Telefone/i }), "19999990000");
  await usuario.type(
    screen.getByRole("textbox", { name: /E-mail/i }),
    "contato@ecomarca.com.br",
  );
  await usuario.type(
    screen.getByRole("textbox", { name: /Nome do responsável/i }),
    "Maria Silva",
  );
  await usuario.type(
    screen.getByLabelText(/^Senha/i, { selector: "input" }),
    "senhaSegura123",
  );
  await usuario.type(
    screen.getByLabelText(/Confirmar senha/i, { selector: "input" }),
    "senhaSegura123",
  );
}

// Preenche a etapa 2 (endereço) com dados válidos.
async function preencherEtapa2(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByRole("textbox", { name: /CEP/i }), "13870000");
  await usuario.type(
    screen.getByRole("textbox", { name: /Endereço/i }),
    "Rua das Flores",
  );
  await usuario.type(screen.getByRole("textbox", { name: /Número/i }), "100");
  await usuario.type(screen.getByRole("textbox", { name: /Bairro/i }), "Centro");
  await usuario.type(
    screen.getByRole("textbox", { name: /Cidade/i }),
    "São João da Boa Vista",
  );
  await usuario.type(screen.getByRole("textbox", { name: /^UF/i }), "SP");
}

// Avança uma etapa clicando em "Continuar".
async function avancar(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole("button", { name: "Continuar" }));
}

// ══════════════════════════════════════════════════════════════════════════
// 6.1 — Loader visível ocultando dados/vazio/erro durante requisição pendente
// ══════════════════════════════════════════════════════════════════════════
describe("6.1 — indicador de carregamento durante requisição pendente", () => {
  it("exibe o loader e oculta dados/vazio/erro enquanto a requisição está pendente", async () => {
    // Deferido controlado manualmente: o fetch fica pendente até resolvermos.
    let resolver!: (valor: Response) => void;
    const pendente = new Promise<Response>((res) => {
      resolver = res;
    });
    // Sobrescreve o fetch global com um stub que devolve a promessa pendente,
    // capturando a chamada para o padrão de "requisição em andamento".
    vi.stubGlobal(
      "fetch",
      vi.fn(() => pendente) as unknown as typeof fetch,
    );

    renderizarComTema(<ListagemHarness />);

    // Durante a pendência: loader visível; nenhum dos outros estados presente.
    expect(screen.getByTestId("estado-carregando")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeVisible();
    expect(screen.queryByTestId("estado-dados")).not.toBeInTheDocument();
    expect(screen.queryByTestId("estado-vazio")).not.toBeInTheDocument();
    expect(screen.queryByTestId("estado-erro")).not.toBeInTheDocument();

    // Resolve a requisição: o loader some e os dados aparecem.
    const corpo = [{ id: "1", nome: "Item A" }];
    const resposta = {
      status: 200,
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => corpo,
    } as unknown as Response;
    resolver(resposta);

    await waitFor(() => {
      expect(screen.queryByTestId("estado-carregando")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("estado-dados")).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 6.2 — Estado vazio com mensagem orientativa e sem loader para 0 itens
// ══════════════════════════════════════════════════════════════════════════
describe("6.2 — estado vazio para listagem com 0 itens", () => {
  it("mostra mensagem orientativa e não exibe o loader quando a lista é vazia", async () => {
    mock.responderPara("/itens", { status: 200, body: [] });

    renderizarComTema(<ListagemHarness />);

    await waitFor(() => {
      expect(screen.getByTestId("estado-vazio")).toBeInTheDocument();
    });
    // Mensagem orientativa presente e loader ausente.
    expect(
      screen.getByText(/Nenhum item cadastrado ainda/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("estado-carregando")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("estado-dados")).not.toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 6.3 — 401 encerra a sessão local e direciona para a autenticação
// ══════════════════════════════════════════════════════════════════════════
describe("6.3 — resposta 401 encerra sessão local e redireciona", () => {
  it("ao receber 401, chama logout (DELETE /sessoes/atual) e redireciona para o login", async () => {
    mock.responderPara("/privado/itens", {
      status: 401,
      body: { statusCode: 401, message: "Não autenticado." },
    });
    // O logout dispara DELETE /sessoes/atual; respondemos 204 (sucesso).
    mock.responderPara("/sessoes/atual", { status: 204 });

    renderizarComTema(<ListagemProtegida />);

    // Encerramento de sessão local: a chamada de logout foi feita.
    await waitFor(() => {
      const chamouLogout = mock.chamadas.some(
        (c) => c.method === "DELETE" && c.url.endsWith("/sessoes/atual"),
      );
      expect(chamouLogout).toBe(true);
    });

    // Redirecionamento para a tela de autenticação capturado pelo router mock.
    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith(ROTA_LOGIN);
    });

    // O conteúdo privado não permanece renderizado com itens.
    expect(screen.queryByTestId("protegida-conteudo")?.textContent ?? "").toBe("");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 6.4 — Erro de validação associa mensagens aos campos e preserva valores
//        (componente real: CadastroWizard)
// ══════════════════════════════════════════════════════════════════════════
describe("6.4 — erro de validação por campo preserva valores (CadastroWizard)", () => {
  it("associa a mensagem ao campo com erro e mantém os valores digitados", async () => {
    // delay: null acelera a digitação em jsdom (muitos campos no wizard).
    const usuario = userEvent.setup({ delay: null });

    // A API responde ao POST /empresas com 422 e um fieldError no campo `email`
    // (campo da etapa 1). O wizard deve voltar para a etapa 1, marcar o campo e
    // mostrar a mensagem no helperText, preservando o que foi digitado.
    mock.responderPara("/empresas", {
      status: 422,
      body: {
        statusCode: 422,
        message: "Há erros no formulário.",
        errors: [{ campo: "email", mensagem: "E-mail já cadastrado." }],
      },
    });

    renderizarComTema(<CadastroWizard />);

    await preencherEtapa1(usuario);
    await avancar(usuario); // etapa 1 → 2
    await preencherEtapa2(usuario);
    await avancar(usuario); // etapa 2 → 3 (revisão)
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));

    // Volta para a etapa 1 e associa a mensagem ao campo de e-mail.
    const campoEmail = await screen.findByRole("textbox", { name: /E-mail/i });
    await waitFor(() => {
      expect(campoEmail).toHaveAttribute("aria-invalid", "true");
    });

    // A mensagem é recuperável a partir do campo (aria-describedby → helperText).
    const describedBy = campoEmail.getAttribute("aria-describedby") ?? "";
    const ids = describedBy.split(/\s+/).filter(Boolean);
    const textos = ids
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
    expect(textos).toMatch(/E-mail já cadastrado/i);

    // Preserva os valores informados pelo usuário na etapa 1.
    expect(campoEmail).toHaveValue("contato@ecomarca.com.br");
    expect(screen.getByRole("textbox", { name: /Razão social/i })).toHaveValue(
      "Empresa Verde LTDA",
    );
    expect(screen.getByRole("textbox", { name: /Nome fantasia/i })).toHaveValue(
      "EcoMarca",
    );
  }, 15000);
});

// ══════════════════════════════════════════════════════════════════════════
// 6.5 — fieldErrors de campos não exibidos aparecem em erro geral
//        (componente real: CadastroWizard — Alert geral carrega a mensagem)
// ══════════════════════════════════════════════════════════════════════════
describe("6.5 — fieldErrors de campos não exibidos surgem em erro geral", () => {
  it("exibe a mensagem geral quando o erro não pertence a um campo da etapa atual", async () => {
    const usuario = userEvent.setup({ delay: null });

    // A API retorna um erro cujo campo (`documento`) não é exibido em nenhuma
    // etapa do wizard. O componente mantém o usuário na etapa de revisão e
    // mostra o Alert de erro geral com a `message` retornada.
    mock.responderPara("/empresas", {
      status: 422,
      body: {
        statusCode: 422,
        message: "Documento inválido: verifique os dados enviados.",
        errors: [{ campo: "documento", mensagem: "Documento inválido." }],
      },
    });

    renderizarComTema(<CadastroWizard />);

    await preencherEtapa1(usuario);
    await avancar(usuario);
    await preencherEtapa2(usuario);
    await avancar(usuario);
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));

    // O Alert de erro geral exibe a mensagem retornada pela API (campo não
    // mapeado para uma etapa visível).
    const alerta = await screen.findByRole("alert");
    expect(
      within(alerta).getByText(/Documento inválido: verifique os dados/i),
    ).toBeInTheDocument();
  }, 15000);
});

// ══════════════════════════════════════════════════════════════════════════
// 6.6 — Erro de rede: mensagem de conexão, oculta loader e nova tentativa
// ══════════════════════════════════════════════════════════════════════════
describe("6.6 — erro de rede exibe mensagem, oculta loader e oferece retry", () => {
  it("mostra falha de conexão sem loader e permite nova tentativa bem-sucedida", async () => {
    const usuario = userEvent.setup();

    // Primeira tentativa falha por rede: o cliente converte em ApiError(0, ...).
    mock.falharPorRede();

    renderizarComTema(<ListagemHarness />);

    // Mensagem de falha de conexão exibida; loader oculto.
    await waitFor(() => {
      expect(screen.getByTestId("estado-erro")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Não foi possível conectar com o servidor/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("estado-carregando")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    // Oferece ação de nova tentativa.
    const botaoRetry = screen.getByTestId("botao-nova-tentativa");
    expect(botaoRetry).toBeInTheDocument();

    // Reconfigura o Mock_API para a próxima tentativa resolver com dados.
    mock.restaurar();
    mock = instalarMockFetch();
    mock.responderPara("/itens", {
      status: 200,
      body: [{ id: "1", nome: "Item A" }],
    });

    await usuario.click(botaoRetry);

    // Após a nova tentativa, os dados aparecem e o erro some.
    await waitFor(() => {
      expect(screen.getByTestId("estado-dados")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("estado-erro")).not.toBeInTheDocument();
    expect(screen.getByText("Item A")).toBeInTheDocument();
  });
});
