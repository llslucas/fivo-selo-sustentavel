// Testes de unidade do Cliente_HTTP (web/src/services/api.ts).
//
// Cobre as Propriedades 1–5 do design (testes-frontend), que descrevem as
// invariantes do cliente HTTP genérico: atalho de 204, round-trip de corpo
// JSON em respostas 2xx, mapeamento de erros em ApiError, conversão de falha
// de rede em ApiError(0, ...) e a invariante de prefixo "/api" + credentials.
//
// Todos os testes são de propriedade (fast-check), uma propriedade por teste,
// com no mínimo 100 iterações. As respostas e falhas de rede são controladas
// pelo Mock_API (instalarMockFetch), que sobrescreve a guarda anti-rede
// instalada globalmente em tests/setup.ts. O reset (restaurar/afterEach) é
// feito globalmente via vi.unstubAllGlobals().

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { request, ApiError } from "@/services/api";
import { instalarMockFetch } from "../helpers/mockFetch";

// Arbitrary para valores JSON-like (objetos, arrays, primitivos aninhados).
// Usado nas propriedades de round-trip de corpo JSON.
const valorJson = fc.jsonValue();

// Arbitrary para um objeto JSON (chave → valor JSON-like), útil quando a
// propriedade exige um corpo em formato de objeto.
const objetoJson = fc.dictionary(fc.string(), fc.jsonValue());

describe("Cliente_HTTP (api.ts)", () => {
  // Feature: testes-frontend, Property 1: 204 retorna undefined sem parse
  // Validates: Requirements 2.1
  it("Property 1: 204 retorna undefined sem parse", () => {
    fc.assert(
      fc.asyncProperty(valorJson, async (corpoIgnorado) => {
        const mock = instalarMockFetch();
        // Mesmo que uma resposta com corpo seja configurada, o status 204 do
        // Mock_API é construído sem corpo nem content-type; o cliente deve
        // devolver undefined sem tentar fazer parse do corpo.
        mock.responderCom({ status: 204, body: corpoIgnorado });

        const resultado = await request("/qualquer-rota");

        expect(resultado).toBeUndefined();
        mock.restaurar();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: testes-frontend, Property 2: Round-trip de corpo JSON em respostas 2xx
  // Validates: Requirements 2.2
  it("Property 2: Round-trip de corpo JSON em respostas 2xx", () => {
    fc.assert(
      fc.asyncProperty(
        objetoJson,
        fc.integer({ min: 200, max: 299 }),
        async (corpo, status) => {
          // 204 é um caso à parte (Property 1): não transporta corpo. Para a
          // invariante de round-trip, exercitamos os demais status 2xx.
          fc.pre(status !== 204);

          const mock = instalarMockFetch();
          mock.responderCom({
            status,
            body: corpo,
            jsonContentType: true,
          });

          const resultado = await request("/recurso");

          // Igualdade estrutural: o cliente retorna o corpo tal como recebido.
          expect(resultado).toStrictEqual(corpo);
          mock.restaurar();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: testes-frontend, Property 3: Mapeamento de erros em ApiError
  // Validates: Requirements 2.3, 5.6
  it("Property 3: Mapeamento de erros em ApiError", () => {
    // Status fora da faixa 200–299 (não-ok).
    const statusDeErro = fc.oneof(
      fc.integer({ min: 100, max: 199 }),
      fc.integer({ min: 300, max: 599 }),
    );

    // Lista de pares {campo, mensagem} com campos únicos para evitar
    // ambiguidade de colisão no mapeamento campo → mensagem.
    const errosUnicos = fc
      .uniqueArray(
        fc.record({
          campo: fc.string({ minLength: 1 }),
          mensagem: fc.string(),
        }),
        {
          selector: (erro) => erro.campo,
          maxLength: 10,
        },
      );

    fc.assert(
      fc.asyncProperty(
        statusDeErro,
        fc.string(),
        errosUnicos,
        async (status, message, errors) => {
          const mock = instalarMockFetch();
          mock.responderCom({
            status,
            body: { statusCode: status, message, errors },
            jsonContentType: true,
          });

          await expect(request("/recurso")).rejects.toSatisfy(
            (erro: unknown) => {
              expect(erro).toBeInstanceOf(ApiError);
              const apiErro = erro as ApiError;
              expect(apiErro.status).toBe(status);
              expect(apiErro.message).toBe(message);

              // fieldErrors contém exatamente uma entrada por campo.
              const chaves = Object.keys(apiErro.fieldErrors);
              expect(chaves).toHaveLength(errors.length);
              for (const { campo, mensagem } of errors) {
                expect(apiErro.fieldErrors[campo]).toBe(mensagem);
              }
              return true;
            },
          );

          mock.restaurar();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: testes-frontend, Property 4: Falha de rede vira ApiError com status 0
  // Validates: Requirements 2.4
  it("Property 4: Falha de rede vira ApiError com status 0", () => {
    fc.assert(
      fc.asyncProperty(
        fc.string(), // path arbitrário
        async (sufixoPath) => {
          const path = `/${sufixoPath}`;
          const mock = instalarMockFetch();
          mock.falharPorRede();

          await expect(request(path)).rejects.toSatisfy((erro: unknown) => {
            expect(erro).toBeInstanceOf(ApiError);
            const apiErro = erro as ApiError;
            expect(apiErro.status).toBe(0);
            // Mensagem indica falha de conexão com o servidor.
            expect(apiErro.message).toContain("conectar com o servidor");
            return true;
          });

          mock.restaurar();
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: testes-frontend, Property 5: Invariante de prefixo e credenciais
  // Validates: Requirements 2.5
  it("Property 5: Invariante de prefixo e credenciais", () => {
    const metodo = fc.constantFrom(
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    );
    // Segmentos de path simples (sem barras extras) compondo o caminho.
    const path = fc
      .array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 4 })
      .map((segmentos) => "/" + segmentos.join("/"));

    fc.assert(
      fc.asyncProperty(path, metodo, async (caminho, method) => {
        const mock = instalarMockFetch();
        // Resposta neutra (204) só para a chamada completar sem erro.
        mock.responderCom({ status: 204 });

        await request(caminho, { method });

        const chamada = mock.ultimaChamada();
        // URL efetiva inicia com o prefixo "/api".
        expect(chamada.url.startsWith("/api")).toBe(true);
        // E termina com o caminho solicitado (prefixo apenas acrescentado).
        expect(chamada.url).toBe(`/api${caminho}`);
        // credentials é "include".
        expect(chamada.init.credentials).toBe("include");

        mock.restaurar();
      }),
      { numRuns: 100 },
    );
  });
});
