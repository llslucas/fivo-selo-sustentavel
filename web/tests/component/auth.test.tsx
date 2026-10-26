// Testes de componente do Contexto_Auth e de uma guarda de área protegida
// (web/src/contexts/AuthContext.tsx).
//
// Cobre:
// - Task 10.1 — exemplos das transições de estado da sessão
//   (`carregando` → `autenticado` | `nao-autenticado` | `expirada`), o `logout`
//   que limpa os dados e uma guarda de rota que não renderiza conteúdo privado
//   nem redireciona enquanto o estado é `carregando` (Requisitos 4.1–4.5, 4.7).
// - Task 10.2 — propriedade de que a área protegida oculta conteúdo privado em
//   qualquer sessão inválida (`nao-autenticado` ou `expirada`) (Requisito 4.6).
//
// Toda a infraestrutura (AuthProvider real + tema MUI + fetch controlado +
// next/navigation mockado) vem do harness compartilhado `authHarness`. As
// respostas do GET /empresas/me são configuradas via `respostaInicialMe` e,
// para `expirada`, pela sequência sucesso→falha de `simularExpiracao()`.

import { useContext } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { screen, waitFor, act, cleanup } from "@testing-library/react";
import fc from "fast-check";

import { AuthContext } from "@/contexts/AuthContext";
import type { EmpresaAtual } from "@/services/empresas";
import { montarAuth, spiesNavegacao } from "../helpers/authHarness";

// ──────────────────────────────────────────────────────────────────────────
// Fixture inline da empresa autenticada. Declarada no próprio teste (sem fonte
// externa), reproduzindo o shape de EmpresaAtual retornado por GET /empresas/me.
// ──────────────────────────────────────────────────────────────────────────
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

// Componente de área protegida: só renderiza o conteúdo privado quando a sessão
// está `autenticado`. Enquanto `carregando` (ou em qualquer estado inválido),
// o conteúdo privado fica ausente e nenhuma navegação é disparada aqui — a
// decisão de redirecionar fica a cargo da aplicação, não desta guarda passiva.
function AreaProtegida() {
  const contexto = useContext(AuthContext);
  if (contexto?.estado !== "autenticado") {
    return <div data-testid="area-publica">conteúdo não disponível</div>;
  }
  return <div data-testid="conteudo-privado">conteúdo privado</div>;
}

// Botão que invoca o `logout` do AuthContext diretamente, para exercitar o
// fluxo de encerramento de sessão a partir de um consumidor real do contexto.
function BotaoLogout() {
  const contexto = useContext(AuthContext);
  return (
    <button
      type="button"
      data-testid="botao-logout"
      onClick={() => void contexto?.logout()}
    >
      sair
    </button>
  );
}

// Limpeza extra entre iterações do property test (o afterEach global também
// desmonta, mas garantimos o DOM limpo entre as renderizações internas).
afterEach(() => {
  cleanup();
});

describe("Contexto_Auth (AuthContext) — transições de estado e guarda de rota", () => {
  // ────────────────────────────────────────────────────────────────────────
  // Task 10.1 — Exemplos de transições de estado do Contexto_Auth
  // ────────────────────────────────────────────────────────────────────────

  // `carregando` sem dados durante a verificação inicial (Req 4.1).
  // Logo após montar, antes de a promessa do GET /empresas/me resolver, o
  // estado deve ser `carregando` e não deve haver dados de empresa. As
  // atualizações de estado do React são assíncronas (microtask), então a
  // primeira renderização síncrona ainda reflete o estado inicial.
  it("carregando: estado inicial sem dados durante a verificação (Req 4.1)", async () => {
    const harness = montarAuth({
      respostaInicialMe: { status: 200, body: empresaFixture },
    });
    harness.render(null);

    // Asserção síncrona sobre a primeira renderização, antes de qualquer flush.
    expect(screen.getByTestId("auth-estado")).toHaveTextContent("carregando");
    expect(screen.getByTestId("auth-empresa-id")).toHaveTextContent("");
    expect(
      screen.getByTestId("auth-empresa-razao-social"),
    ).toHaveTextContent("");

    // Deixa a verificação inicial assentar dentro de act(), evitando o aviso de
    // atualização de estado fora de act após o fim do teste.
    await waitFor(() => {
      expect(screen.getByTestId("auth-estado")).toHaveTextContent(
        "autenticado",
      );
    });
  });

  // `autenticado` expõe dados idênticos aos retornados (Req 4.2).
  it("autenticado: expõe os dados da empresa idênticos ao retorno (Req 4.2)", async () => {
    const harness = montarAuth({
      respostaInicialMe: { status: 200, body: empresaFixture },
    });
    harness.render(null);

    await waitFor(() => {
      expect(screen.getByTestId("auth-estado")).toHaveTextContent(
        "autenticado",
      );
    });

    // Os dados expostos pela sonda refletem exatamente a fixture retornada.
    expect(screen.getByTestId("auth-empresa-id")).toHaveTextContent(
      empresaFixture.id,
    );
    expect(
      screen.getByTestId("auth-empresa-razao-social"),
    ).toHaveTextContent(empresaFixture.razaoSocial);
    // A empresa capturada no contexto é estruturalmente igual à fixture.
    expect(harness.empresaAtual()).toEqual(empresaFixture);
  });

  // `nao-autenticado` sem autenticação prévia (Req 4.3).
  it("nao-autenticado: sem autenticação prévia, sem dados de empresa (Req 4.3)", async () => {
    const harness = montarAuth({
      respostaInicialMe: {
        status: 401,
        body: { statusCode: 401, message: "Não autenticado." },
      },
    });
    harness.render(null);

    await waitFor(() => {
      expect(screen.getByTestId("auth-estado")).toHaveTextContent(
        "nao-autenticado",
      );
    });

    expect(screen.getByTestId("auth-empresa-id")).toHaveTextContent("");
    expect(harness.empresaAtual()).toBeNull();
  });

  // `expirada` após autenticação prévia, removendo os dados (Req 4.4).
  it("expirada: após autenticação prévia, remove os dados (Req 4.4)", async () => {
    const harness = montarAuth({
      respostaInicialMe: { status: 200, body: empresaFixture },
    });
    harness.render(null);

    // Primeiro autentica com a resposta inicial de sucesso.
    await waitFor(() => {
      expect(screen.getByTestId("auth-estado")).toHaveTextContent(
        "autenticado",
      );
    });

    // Depois a reconsulta falha: como já autenticou antes, vai para `expirada`.
    await act(async () => {
      await harness.simularExpiracao();
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-estado")).toHaveTextContent("expirada");
    });
    expect(screen.getByTestId("auth-empresa-id")).toHaveTextContent("");
    expect(harness.empresaAtual()).toBeNull();
  });

  // `logout` remove os dados e passa a `nao-autenticado` (Req 4.5).
  it("logout: remove os dados e vai para nao-autenticado (Req 4.5)", async () => {
    const harness = montarAuth({
      respostaInicialMe: { status: 200, body: empresaFixture },
    });
    // DELETE /sessoes/atual responde 204 (sucesso sem corpo).
    harness.mock.responderPara("/sessoes/atual", { status: 204 });
    harness.render(<BotaoLogout />);

    await waitFor(() => {
      expect(screen.getByTestId("auth-estado")).toHaveTextContent(
        "autenticado",
      );
    });

    // Dispara o logout a partir de um consumidor real do contexto.
    await act(async () => {
      screen.getByTestId("botao-logout").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-estado")).toHaveTextContent(
        "nao-autenticado",
      );
    });
    expect(screen.getByTestId("auth-empresa-id")).toHaveTextContent("");
    expect(harness.empresaAtual()).toBeNull();

    // Confirma que o logout chamou DELETE /sessoes/atual.
    const chamadaLogout = harness.mock.chamadas.find(
      (c) => c.method === "DELETE" && c.url.endsWith("/sessoes/atual"),
    );
    expect(chamadaLogout).toBeDefined();
  });

  // `carregando` não renderiza conteúdo privado e não redireciona
  // prematuramente (Req 4.7). Enquanto a verificação inicial está pendente, a
  // área protegida mostra apenas o fallback público e nenhuma navegação ocorre.
  it("carregando: não renderiza conteúdo privado nem redireciona (Req 4.7)", async () => {
    const harness = montarAuth({
      respostaInicialMe: { status: 200, body: empresaFixture },
    });
    harness.render(<AreaProtegida />);

    // Primeira renderização síncrona: ainda `carregando`.
    expect(screen.getByTestId("auth-estado")).toHaveTextContent("carregando");
    expect(screen.queryByTestId("conteudo-privado")).not.toBeInTheDocument();
    expect(screen.getByTestId("area-publica")).toBeInTheDocument();

    // Nenhum redirecionamento disparado prematuramente durante o carregamento.
    expect(spiesNavegacao.router.push).not.toHaveBeenCalled();
    expect(spiesNavegacao.router.replace).not.toHaveBeenCalled();
    expect(spiesNavegacao.redirect).not.toHaveBeenCalled();

    // Deixa a verificação inicial assentar dentro de act() antes de encerrar.
    await waitFor(() => {
      expect(screen.getByTestId("auth-estado")).toHaveTextContent(
        "autenticado",
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Task 10.2 — Property test
  // ────────────────────────────────────────────────────────────────────────

  // Feature: testes-frontend, Property 7: Área protegida oculta conteúdo privado em sessões inválidas
  // Validates: Requirements 4.6
  it("Property 7: Área protegida oculta conteúdo privado em sessões inválidas", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom<"nao-autenticado" | "expirada">(
          "nao-autenticado",
          "expirada",
        ),
        async (estadoAlvo) => {
          // `expirada` exige autenticação prévia (sucesso) seguida de falha;
          // `nao-autenticado` começa já com falha na verificação inicial.
          const respostaInicialMe =
            estadoAlvo === "expirada"
              ? { status: 200, body: empresaFixture }
              : {
                  status: 401,
                  body: { statusCode: 401, message: "Não autenticado." },
                };

          const harness = montarAuth({ respostaInicialMe });
          const { unmount } = harness.render(<AreaProtegida />);

          try {
            if (estadoAlvo === "expirada") {
              // Autentica e depois expira a sessão.
              await waitFor(() => {
                expect(screen.getByTestId("auth-estado")).toHaveTextContent(
                  "autenticado",
                );
              });
              await act(async () => {
                await harness.simularExpiracao();
              });
            }

            // Aguarda o estado inválido alvo.
            await waitFor(() => {
              expect(screen.getByTestId("auth-estado")).toHaveTextContent(
                estadoAlvo,
              );
            });

            // Invariante: em qualquer sessão inválida, o conteúdo privado está
            // ausente e apenas o fallback público é renderizado.
            expect(
              screen.queryByTestId("conteudo-privado"),
            ).not.toBeInTheDocument();
            expect(screen.getByTestId("area-publica")).toBeInTheDocument();
          } finally {
            // Desmonta e restaura o Mock_API a cada iteração, garantindo
            // independência entre as execuções da propriedade.
            unmount();
            cleanup();
            harness.mock.restaurar();
          }
        },
      ),
      { numRuns: 10 },
    );
  });
});
