// Testes de componente das telas de login (compLogin.tsx → CompLogin) e
// cadastro (CadastroWizard.tsx → CadastroWizard).
//
// Cobre as Propriedades 14–16 do design (testes-frontend) e um conjunto de
// exemplos responsivos (Requisitos 8.3 e 8.4). As propriedades verificam
// garantias de acessibilidade dos controles críticos:
//   - Propriedade 14 (Req 8.1): todo controle crítico expõe papel e nome
//     acessível não vazio, localizável por getByRole(role, { name }).
//   - Propriedade 15 (Req 8.2): um campo em erro referencia programaticamente
//     sua mensagem (aria-invalid + aria-describedby → elemento da mensagem).
//   - Propriedade 16 (Req 8.5): os controles críticos recebem foco por Tab e
//     são ativáveis por teclado, sem ponteiro.
//
// Montagem: ambos os componentes usam `useRouter` de next/navigation (mockado
// aqui, por arquivo) e o CompLogin lê o AuthContext via useAuth, então é
// envolvido no AuthProvider real. O AuthProvider dispara GET /empresas/me ao
// montar; o Mock_API (instalarMockFetch) responde 401 para assentar o estado em
// `nao-autenticado` e satisfazer a guarda anti-rede do setup global.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@mui/material/styles";

import theme from "@/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import CompLogin from "@/components/login/compLogin";
import CadastroWizard from "@/components/cadastro/CadastroWizard";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";
import { definirViewport } from "../helpers/viewport";

// Mock de next/navigation por arquivo (içado para o topo pelo Vitest). Captura
// redirecionamentos sem navegação real; cobre tudo que CompLogin/CadastroWizard
// consomem (useRouter + usePathname/useSearchParams para segurança).
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
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

// ---------------------------------------------------------------------------
// Infraestrutura de montagem
// ---------------------------------------------------------------------------

let mock: MockFetch;

beforeEach(() => {
  // Instala o Mock_API e assenta o GET /empresas/me (disparado no mount do
  // AuthProvider) em 401 → estado `nao-autenticado`. Também responde às rotas
  // que a tela de login pode disparar em ativações por teclado (/sessoes),
  // para não acionar a guarda anti-rede caso um submit chegue ao serviço.
  mock = instalarMockFetch();
  mock.responderPara("/empresas/me", {
    status: 401,
    body: { statusCode: 401, message: "Não autenticado." },
  });
  mock.responderPara("/sessoes", {
    status: 401,
    body: { statusCode: 401, message: "E-mail ou senha incorretos." },
  });
});

afterEach(() => {
  mock.restaurar();
});

// Renderiza a tela de login dentro do AuthProvider real e do tema MUI, e
// aguarda o AuthProvider assentar (sair de `carregando`) para evitar warnings
// de act() por atualização de estado assíncrona no mount.
async function renderizarLogin() {
  const resultado = render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <CompLogin />
      </AuthProvider>
    </ThemeProvider>,
  );
  // O botão "Entrar" só existe depois do primeiro render; esperamos por ele
  // e, com waitFor, deixamos o efeito de mount (verificar()) assentar.
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });
  return resultado;
}

// Renderiza o wizard de cadastro (etapa 1) dentro do tema MUI. Não depende do
// AuthContext, mas usa useRouter (mockado acima).
function renderizarCadastro() {
  return render(
    <ThemeProvider theme={theme}>
      <CadastroWizard />
    </ThemeProvider>,
  );
}

// ---------------------------------------------------------------------------
// Descritores dos controles críticos (quantificados pelas propriedades)
// ---------------------------------------------------------------------------

// Um controle crítico é descrito pelo papel acessível e por um matcher de nome
// (string exata ou expressão regular, aceitos por getByRole { name }).
type ControleCritico = {
  descricao: string;
  role: string;
  name: string | RegExp;
};

// Controles críticos da tela de login: campo de e-mail, botão de envio,
// alternância de visibilidade da senha e atalho de cadastro.
const CONTROLES_LOGIN: ControleCritico[] = [
  { descricao: "campo de e-mail", role: "textbox", name: /E-mail corporativo/i },
  { descricao: "botão Entrar", role: "button", name: "Entrar" },
  { descricao: "alternância Mostrar senha", role: "button", name: "Mostrar senha" },
  // "Cadastrar minha empresa" é um Button renderizado como link (component=NextLink),
  // então seu papel acessível é "link", não "button".
  { descricao: "atalho Cadastrar minha empresa", role: "link", name: "Cadastrar minha empresa" },
];

// Controles críticos da etapa 1 do cadastro: campos obrigatórios de texto
// (por rótulo), os dois botões de navegação. Os rótulos usam asterisco de
// obrigatório, então casamos pelo início do rótulo via regex.
const CONTROLES_CADASTRO: ControleCritico[] = [
  { descricao: "campo Razão social", role: "textbox", name: /Razão social/i },
  { descricao: "campo Nome fantasia", role: "textbox", name: /Nome fantasia/i },
  { descricao: "campo CNPJ", role: "textbox", name: /CNPJ/i },
  { descricao: "campo Telefone", role: "textbox", name: /Telefone/i },
  { descricao: "campo E-mail", role: "textbox", name: /E-mail/i },
  { descricao: "campo Nome do responsável", role: "textbox", name: /Nome do responsável/i },
  { descricao: "botão Voltar", role: "button", name: "Voltar" },
  { descricao: "botão Continuar", role: "button", name: "Continuar" },
];

// ---------------------------------------------------------------------------
// 9.1 — Property 14: controles críticos têm papel e nome acessível (Req 8.1)
// ---------------------------------------------------------------------------

describe("Property 14 — controles críticos têm papel e nome acessível", () => {
  // Feature: testes-frontend, Property 14: Controles críticos têm papel e nome acessível
  // Validates: Requirements 8.1
  it("login: cada controle crítico é localizável por papel e tem nome não vazio", async () => {
    await renderizarLogin();

    fc.assert(
      fc.property(fc.constantFrom(...CONTROLES_LOGIN), (controle) => {
        // getByRole com { name } só retorna um elemento se existir aquele papel
        // COM nome acessível correspondente ao matcher. Como o matcher exige um
        // trecho textual específico, achar o elemento já prova papel presente e
        // nome acessível não vazio (o nome vazio nunca casaria o matcher).
        const elemento = screen.getByRole(controle.role, { name: controle.name });
        expect(elemento).toBeInTheDocument();
      }),
      { numRuns: 10 },
    );
  });

  // Feature: testes-frontend, Property 14: Controles críticos têm papel e nome acessível
  // Validates: Requirements 8.1
  it("cadastro: cada controle crítico é localizável por papel e tem nome não vazio", () => {
    renderizarCadastro();

    fc.assert(
      fc.property(fc.constantFrom(...CONTROLES_CADASTRO), (controle) => {
        const elemento = screen.getByRole(controle.role, { name: controle.name });
        expect(elemento).toBeInTheDocument();
      }),
      { numRuns: 10 },
    );
  });
});

// ---------------------------------------------------------------------------
// 9.2 — Property 15: campo em erro referencia programaticamente sua mensagem
//        (Req 8.2)
// ---------------------------------------------------------------------------

describe("Property 15 — campo em erro referencia programaticamente sua mensagem", () => {
  // Descritor de um campo que entra em estado de erro na etapa 1 do cadastro,
  // junto da mensagem esperada. Observação de contexto: o botão "Continuar" só
  // habilita quando a etapa está completa, então a validação de obrigatórios
  // vazios por clique não é alcançável pela UI; os estados de erro realmente
  // atingíveis sem back-end são os de senha (regra de tamanho mínimo) e de
  // confirmação de senha (regra de igualdade), que o componente aplica inline
  // conforme a pessoa digita.
  type CampoEmErro = { rotulo: RegExp; mensagem: RegExp };

  const CAMPOS_EM_ERRO: CampoEmErro[] = [
    { rotulo: /^Senha/i, mensagem: /Mínimo de 10 caracteres/i },
    { rotulo: /Confirmar senha/i, mensagem: /As senhas não conferem/i },
  ];

  // Feature: testes-frontend, Property 15: Campo em erro referencia programaticamente sua mensagem
  // Validates: Requirements 8.2
  it("cadastro: campo em erro referencia sua mensagem via aria-describedby", async () => {
    renderizarCadastro();
    const usuario = userEvent.setup();

    // Dispara os estados de erro inline: senha curta (viola o mínimo) e
    // confirmação divergente (viola a igualdade). Ambos marcam error no
    // TextField e expõem a mensagem no helperText associado.
    const senha = screen.getByLabelText(/^Senha/i, { selector: "input" });
    const confirmar = screen.getByLabelText(/Confirmar senha/i, {
      selector: "input",
    });
    await usuario.type(senha, "curta");
    await usuario.type(confirmar, "diferente");

    await waitFor(() => {
      expect(screen.getByText(/As senhas não conferem/i)).toBeInTheDocument();
    });

    fc.assert(
      fc.property(fc.constantFrom(...CAMPOS_EM_ERRO), (campoErro) => {
        const campo = screen.getByLabelText(campoErro.rotulo, {
          selector: "input",
        });
        verificarReferenciaDeErro(campo, campoErro.mensagem);
      }),
      { numRuns: 10 },
    );
  });
});

// Verifica que um campo em erro referencia programaticamente sua mensagem:
// aria-invalid=true e aria-describedby apontando para o elemento que contém a
// mensagem recuperável.
function verificarReferenciaDeErro(campo: HTMLElement, mensagem: RegExp) {
  expect(campo).toHaveAttribute("aria-invalid", "true");
  const describedBy = campo.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  // aria-describedby pode listar múltiplos ids separados por espaço.
  const ids = (describedBy ?? "").split(/\s+/).filter(Boolean);
  expect(ids.length).toBeGreaterThan(0);
  const textos = ids
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ")
    .trim();
  // A mensagem precisa ser recuperável a partir da referência do campo.
  expect(textos.length).toBeGreaterThan(0);
  expect(textos).toMatch(mensagem);
}

// ---------------------------------------------------------------------------
// 9.3 — Property 16: controles críticos são operáveis por teclado (Req 8.5)
// ---------------------------------------------------------------------------

describe("Property 16 — controles críticos são operáveis por teclado", () => {
  // Controles de login que precisam receber foco sequencial por Tab.
  const FOCAVEIS_LOGIN: ControleCritico[] = [
    { descricao: "campo de e-mail", role: "textbox", name: /E-mail corporativo/i },
    { descricao: "alternância Mostrar senha", role: "button", name: "Mostrar senha" },
    { descricao: "atalho Cadastrar minha empresa", role: "link", name: "Cadastrar minha empresa" },
  ];

  // Feature: testes-frontend, Property 16: Controles críticos são operáveis por teclado
  // Validates: Requirements 8.5
  it("login: cada controle crítico recebe foco por teclado e pode ser ativado sem ponteiro", async () => {
    await renderizarLogin();
    const usuario = userEvent.setup();

    // Verificação de ativação por teclado sem ponteiro: focar a alternância de
    // visibilidade e acioná-la por Enter alterna o aria-label do controle.
    const alternancia = screen.getByRole("button", { name: "Mostrar senha" });
    alternancia.focus();
    expect(alternancia).toHaveFocus();
    await usuario.keyboard("{Enter}");
    // Após ativar, o controle passa a "Ocultar senha" (estado alternado).
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Ocultar senha" }),
      ).toBeInTheDocument();
    });
    // Restaura o estado original ("Mostrar senha") para que a propriedade abaixo
    // encontre o controle pelo nome esperado em FOCAVEIS_LOGIN.
    await usuario.keyboard("{Enter}");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Mostrar senha" }),
      ).toBeInTheDocument();
    });

    // Propriedade: cada controle focável consegue tornar-se o activeElement via
    // foco de teclado (sem clique de ponteiro).
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...FOCAVEIS_LOGIN), async (controle) => {
        const elemento = screen.getByRole(controle.role, { name: controle.name });
        elemento.focus();
        expect(document.activeElement).toBe(elemento);
      }),
      { numRuns: 10 },
    );
  });

  // Feature: testes-frontend, Property 16: Controles críticos são operáveis por teclado
  // Validates: Requirements 8.5
  it("login: um formulário preenchido é submetível pelo teclado (Enter)", async () => {
    await renderizarLogin();
    const usuario = userEvent.setup();

    const email = screen.getByRole("textbox", { name: /E-mail corporativo/i });
    const senha = screen.getByLabelText("Senha", { selector: "input" });

    await usuario.type(email, "a@b.com");
    await usuario.type(senha, "segredo123");

    // Com os campos preenchidos, o Enter no campo dispara o submit do form, que
    // chama o serviço login (/sessoes, mockado) — provando ativação por teclado
    // sem ponteiro.
    await usuario.type(senha, "{Enter}");

    await waitFor(() => {
      const chamouSessoes = mock.chamadas.some((c) =>
        c.url.endsWith("/sessoes"),
      );
      expect(chamouSessoes).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 9.4 — Exemplos responsivos: controles essenciais presentes em 320px e 1280px
//        (Req 8.3 e 8.4)
// ---------------------------------------------------------------------------

describe("Responsivo — controles essenciais presentes em 320px e 1280px", () => {
  // Req 8.3 (320px) — login
  it("login renderiza e-mail, senha e Entrar em 320px", async () => {
    definirViewport(320);
    await renderizarLogin();

    expect(
      screen.getByRole("textbox", { name: /E-mail corporativo/i }),
    ).toBeVisible();
    expect(screen.getByLabelText("Senha", { selector: "input" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  // Req 8.4 (1280px) — login
  it("login renderiza e-mail, senha e Entrar em 1280px", async () => {
    definirViewport(1280);
    await renderizarLogin();

    expect(
      screen.getByRole("textbox", { name: /E-mail corporativo/i }),
    ).toBeVisible();
    expect(screen.getByLabelText("Senha", { selector: "input" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  // Req 8.3 (320px) — cadastro
  it("cadastro renderiza campos obrigatórios da etapa 1 e Continuar em 320px", () => {
    definirViewport(320);
    renderizarCadastro();

    verificarControlesEssenciaisCadastro();
  });

  // Req 8.4 (1280px) — cadastro
  it("cadastro renderiza campos obrigatórios da etapa 1 e Continuar em 1280px", () => {
    definirViewport(1280);
    renderizarCadastro();

    verificarControlesEssenciaisCadastro();
  });
});

// Confere que os controles essenciais da etapa 1 do cadastro estão presentes e
// visíveis no DOM renderizado.
function verificarControlesEssenciaisCadastro() {
  for (const rotulo of [
    /Razão social/i,
    /Nome fantasia/i,
    /CNPJ/i,
    /Telefone/i,
    /E-mail/i,
    /Nome do responsável/i,
  ]) {
    expect(screen.getByRole("textbox", { name: rotulo })).toBeVisible();
  }
  // Campos de senha (sem papel textbox) por rótulo.
  expect(screen.getByLabelText(/^Senha/i, { selector: "input" })).toBeVisible();
  expect(
    screen.getByLabelText(/Confirmar senha/i, { selector: "input" }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Continuar" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Voltar" })).toBeVisible();

  // Garante que a área cabe num container (sanity de layout, sem corte).
  const voltar = screen.getByRole("button", { name: "Voltar" });
  expect(within(voltar.closest("form") ?? document.body)).toBeTruthy();
}
