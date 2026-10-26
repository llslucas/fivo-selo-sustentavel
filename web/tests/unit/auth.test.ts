// Testes de unidade do Servico_Auth (web/src/services/auth.ts).
//
// Cobre a Propriedade 6 do design (testes-frontend) — login/logout não tocam o
// armazenamento do frontend — e os exemplos de contrato e resultados de
// `login`/`logout` (Requisitos 3.1–3.6).
//
// As respostas e falhas de rede são controladas pelo Mock_API
// (instalarMockFetch), que sobrescreve a guarda anti-rede instalada
// globalmente em tests/setup.ts. O reset é feito globalmente via afterEach
// (vi.unstubAllGlobals + vi.restoreAllMocks). Como fast-check executa várias
// iterações dentro de um único teste, os spies de storage/cookie são
// restaurados ao final de cada iteração.

import { describe, it, expect, vi } from "vitest";
import fc from "fast-check";

import { login, logout } from "@/services/auth";
import { ApiError } from "@/services/api";
import { instalarMockFetch } from "../helpers/mockFetch";
import { assertContrato } from "../helpers/requestContract";

// Arbitraries para credenciais arbitrárias. `email`/`senha` são tratados como
// strings opacas pelo Servico_Auth (ele apenas as serializa no corpo JSON),
// portanto não precisam ter formato válido de e-mail.
const email = fc.string();
const senha = fc.string();

describe("Servico_Auth (auth.ts)", () => {
  // ──────────────────────────────────────────────────────────────────────
  // Task 6.1 — Property test
  // ──────────────────────────────────────────────────────────────────────

  // Feature: testes-frontend, Property 6: Login não toca armazenamento do frontend
  // Validates: Requirements 3.6
  it("Property 6: Login não toca armazenamento do frontend", async () => {
    await fc.assert(
      fc.asyncProperty(email, senha, async (emailArb, senhaArb) => {
        const mock = instalarMockFetch();
        // Fluxos de autenticação respondem com sucesso: login 200 { papel }
        // e logout 204 (sem corpo).
        mock.responderPara("/sessoes/atual", { status: 204 });
        mock.responderPara("/sessoes", {
          status: 200,
          body: { papel: "EMPRESA" },
          jsonContentType: true,
        });

        // Espiona leitura/gravação em localStorage e sessionStorage. Usamos
        // Storage.prototype para cobrir qualquer instância (window.localStorage
        // e window.sessionStorage herdam desse protótipo no jsdom).
        const spies = [
          vi.spyOn(Storage.prototype, "getItem"),
          vi.spyOn(Storage.prototype, "setItem"),
          vi.spyOn(Storage.prototype, "removeItem"),
        ];

        // Espiona o acesso a document.cookie (getter e setter). Guardamos o
        // descritor original para restaurar ao final da iteração.
        const descritorOriginal = Object.getOwnPropertyDescriptor(
          Document.prototype,
          "cookie",
        ) ??
          Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(document),
            "cookie",
          ) ?? {
            configurable: true,
            get(): string {
              return "";
            },
            set(_valor: string): void {
              /* no-op */
            },
          };

        const cookieGetSpy = vi.fn<() => string>(() => "");
        const cookieSetSpy = vi.fn<(valor: string) => void>(() => {
          /* no-op */
        });

        Object.defineProperty(document, "cookie", {
          configurable: true,
          get: cookieGetSpy,
          set: cookieSetSpy,
        });

        try {
          // Exercita ambos os fluxos de autenticação com credenciais arbitrárias.
          await login(emailArb, senhaArb);
          await logout();

          // Nenhum spy de armazenamento/cookie pode ter sido chamado.
          for (const spy of spies) {
            expect(spy).not.toHaveBeenCalled();
          }
          expect(cookieGetSpy).not.toHaveBeenCalled();
          expect(cookieSetSpy).not.toHaveBeenCalled();
        } finally {
          // Restaura document.cookie ao descritor original e desfaz os spies de
          // storage, garantindo independência entre iterações.
          Object.defineProperty(document, "cookie", descritorOriginal);
          for (const spy of spies) {
            spy.mockRestore();
          }
          mock.restaurar();
        }
      }),
      { numRuns: 100 },
    );
  });

  // ──────────────────────────────────────────────────────────────────────
  // Task 6.2 — Exemplos de contrato e resultados de `login`/`logout`
  // ──────────────────────────────────────────────────────────────────────

  // Contrato de login (Req 3.1): POST /sessoes, Content-Type application/json,
  // corpo { email, senha } com os valores informados.
  it("login: contrato POST /sessoes com Content-Type JSON e corpo { email, senha } (Req 3.1)", async () => {
    const mock = instalarMockFetch();
    mock.responderPara("/sessoes", {
      status: 200,
      body: { papel: "EMPRESA" },
      jsonContentType: true,
    });

    await login("empresa@exemplo.com", "senha-secreta");

    assertContrato(mock.ultimaChamada(), {
      metodo: "POST",
      rota: "/sessoes",
      contentType: "application/json",
      corpoJson: { email: "empresa@exemplo.com", senha: "senha-secreta" },
    });

    mock.restaurar();
  });

  // Sucesso 200/201 retorna { papel } com texto não vazio (Req 3.2).
  it.each([200, 201])(
    "login: sucesso %i retorna { papel } não vazio (Req 3.2)",
    async (status) => {
      const mock = instalarMockFetch();
      mock.responderPara("/sessoes", {
        status,
        body: { papel: "EMPRESA" },
        jsonContentType: true,
      });

      const resultado = await login("empresa@exemplo.com", "senha-secreta");

      expect(resultado).toEqual({ papel: "EMPRESA" });
      expect(typeof resultado.papel).toBe("string");
      expect(resultado.papel.length).toBeGreaterThan(0);

      mock.restaurar();
    },
  );

  // 401 lança ApiError status 401 e não retorna objeto de sessão (Req 3.3).
  it("login: 401 lança ApiError status 401 sem objeto de sessão (Req 3.3)", async () => {
    const mock = instalarMockFetch();
    mock.responderPara("/sessoes", {
      status: 401,
      body: { statusCode: 401, message: "Credenciais inválidas." },
      jsonContentType: true,
    });

    let resultado: unknown;
    let capturado: unknown;
    try {
      resultado = await login("empresa@exemplo.com", "senha-errada");
    } catch (erro) {
      capturado = erro;
    }

    // Nenhum objeto de sessão foi retornado.
    expect(resultado).toBeUndefined();
    expect(capturado).toBeInstanceOf(ApiError);
    expect((capturado as ApiError).status).toBe(401);

    mock.restaurar();
  });

  // 400/422/500 e falha de rede lançam ApiError sem objeto de sessão (Req 3.4).
  it.each([400, 422, 500])(
    "login: status %i lança ApiError sem objeto de sessão (Req 3.4)",
    async (status) => {
      const mock = instalarMockFetch();
      mock.responderPara("/sessoes", {
        status,
        body: { statusCode: status, message: "Erro." },
        jsonContentType: true,
      });

      let resultado: unknown;
      let capturado: unknown;
      try {
        resultado = await login("empresa@exemplo.com", "senha");
      } catch (erro) {
        capturado = erro;
      }

      expect(resultado).toBeUndefined();
      expect(capturado).toBeInstanceOf(ApiError);
      expect((capturado as ApiError).status).toBe(status);

      mock.restaurar();
    },
  );

  it("login: falha de rede lança ApiError sem objeto de sessão (Req 3.4)", async () => {
    const mock = instalarMockFetch();
    mock.falharPorRede();

    let resultado: unknown;
    let capturado: unknown;
    try {
      resultado = await login("empresa@exemplo.com", "senha");
    } catch (erro) {
      capturado = erro;
    }

    expect(resultado).toBeUndefined();
    expect(capturado).toBeInstanceOf(ApiError);
    // Falha de rede é mapeada para ApiError com status 0.
    expect((capturado as ApiError).status).toBe(0);

    mock.restaurar();
  });

  // Contrato de logout (Req 3.5): DELETE /sessoes/atual, corpo vazio, resolve
  // em 200/204.
  it("logout: contrato DELETE /sessoes/atual com corpo vazio (Req 3.5)", async () => {
    const mock = instalarMockFetch();
    mock.responderPara("/sessoes/atual", { status: 204 });

    const resultado = await logout();

    // 204 resolve com undefined (sem objeto de sessão).
    expect(resultado).toBeUndefined();

    const chamada = mock.ultimaChamada();
    assertContrato(chamada, {
      metodo: "DELETE",
      rota: "/sessoes/atual",
    });
    // O corpo da requisição é vazio (nenhum body informado).
    expect(chamada.body == null).toBe(true);

    mock.restaurar();
  });

  it("logout: resolve em 200 sem corpo de sessão (Req 3.5)", async () => {
    const mock = instalarMockFetch();
    // 200 sem corpo/content-type: o cliente retorna undefined.
    mock.responderPara("/sessoes/atual", { status: 200 });

    const resultado = await logout();

    expect(resultado).toBeUndefined();

    assertContrato(mock.ultimaChamada(), {
      metodo: "DELETE",
      rota: "/sessoes/atual",
    });

    mock.restaurar();
  });
});
