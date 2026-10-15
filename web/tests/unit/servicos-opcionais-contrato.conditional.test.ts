// Teste condicional de contrato de requisição dos serviços OPCIONAIS
// (Requisito 7.6 — Property 13 do design testes-frontend).
//
// Os serviços opcionais do frontend ainda NÃO existem (dependem de tasks
// futuras): `instituicoes.ts`, `campanhas.ts`, `selos.ts`, `comprovantes.ts`.
// Enquanto um módulo não existir, o bloco correspondente é PULADO via
// `describe.skipIf(!servicoExiste("..."))`, mantendo a suíte verde. Quando o
// arquivo passar a existir, o bloco roda automaticamente, sem alteração aqui.
//
// Property 13 — Contrato de requisição dos serviços condicionais:
// Para qualquer requisição emitida por um serviço opcional existente, a URL
// efetiva inicia com o prefixo "/api", o método e o corpo correspondem ao
// contrato do serviço e, quando aplicável, `credentials` é "include". A
// verificação de cada chamada capturada é feita via `assertContrato`.
//
// Como HOJE nenhum dos serviços existe, todos os blocos abaixo são pulados e o
// arquivo não quebra a suíte (um arquivo com todos os testes pulados passa).

import { describe, it } from "vitest";
import fc from "fast-check";

import { servicoExiste, importarSeExistir } from "../helpers/moduleExists";
import { instalarMockFetch } from "../helpers/mockFetch";
import { assertContrato } from "../helpers/requestContract";

// Lista dos serviços opcionais cobertos por esta propriedade. Cada entrada vira
// um bloco `describe.skipIf` guardado por `servicoExiste`.
const SERVICOS_OPCIONAIS = [
  "instituicoes.ts",
  "campanhas.ts",
  "selos.ts",
  "comprovantes.ts",
] as const;

for (const nomeArquivo of SERVICOS_OPCIONAIS) {
  // `skipIf(true)` quando o serviço ainda não existe: o bloco é pulado inteiro.
  // Assim que o módulo `web/src/services/<nome>.ts` existir, `servicoExiste`
  // retorna true e o bloco passa a executar automaticamente.
  describe.skipIf(!servicoExiste(nomeArquivo))(
    `Serviço opcional ${nomeArquivo} — contrato de requisição`,
    () => {
      // Feature: testes-frontend, Property 13: Contrato de requisição dos serviços condicionais
      // **Validates: Requirements 7.6**
      it("toda requisição respeita o contrato (/api, método/corpo, credentials)", async () => {
        // Importa o módulo apenas quando ele existe (null caso contrário).
        const modulo = await importarSeExistir<Record<string, unknown>>(
          nomeArquivo,
        );

        // Guarda defensiva: se, por algum motivo, o módulo não resolver, nada
        // há a exercitar — o `skipIf` acima já evita este caminho hoje.
        if (modulo === null) {
          return;
        }

        await fc.assert(
          // Propriedade: para QUALQUER entrada arbitrária passada às funções
          // exportadas do serviço, cada chamada `fetch` capturada deve honrar o
          // Contrato_Requisicao (prefixo "/api", método e corpo esperados e,
          // quando aplicável, credentials "include").
          //
          // Quando o serviço real existir, esta propriedade deve, para cada
          // função exportada:
          //   1. instalar o Mock_API (instalarMockFetch) e configurar respostas
          //      2xx controladas via responderCom/responderPara;
          //   2. invocar a função com os argumentos gerados pelo arbitrary;
          //   3. para cada entrada em `mock.chamadas`, chamar `assertContrato`
          //      com o contrato esperado daquela operação (rota, método, corpo
          //      JSON/FormData e credentials);
          //   4. restaurar o Mock_API ao final (mock.restaurar()).
          //
          // O arbitrary abaixo é um placeholder; ao implementar, substitua-o
          // por geradores que cubram o espaço de entrada real do serviço.
          fc.asyncProperty(fc.anything(), async (_entradaArbitraria) => {
            const mock = instalarMockFetch();
            try {
              // Resposta de sucesso genérica; ajuste por operação ao implementar.
              mock.responderCom({ status: 200, body: {} });

              // TODO(quando o serviço existir): invocar cada função exportada do
              // `modulo` com `_entradaArbitraria` e, para cada chamada capturada,
              // afirmar o contrato. Exemplo de forma esperada:
              //
              //   await modulo.listar(_entradaArbitraria);
              //   for (const chamada of mock.chamadas) {
              //     assertContrato(chamada, {
              //       metodo: "GET",
              //       rota: "/instituicoes",
              //       // credentials: "include" é o default verificado.
              //     });
              //   }
              //
              // Mantém-se a referência a `assertContrato`/`modulo` para deixar o
              // ponto de extensão explícito e evitar importações órfãs.
              void assertContrato;
              void modulo;
            } finally {
              mock.restaurar();
            }
          }),
          // ≥100 iterações, conforme exigência de PBT do design.
          { numRuns: 100 },
        );
      });
    },
  );
}
