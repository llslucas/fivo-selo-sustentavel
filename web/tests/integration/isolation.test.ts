// Testes de isolamento da suíte de testes do frontend (web/).
//
// Cobre as garantias de que a suíte roda em Ambiente_Limpo, sem qualquer
// dependência de serviços externos (Requisitos 9.1, 9.4, 9.5 e 9.6):
// - Property 17 (14.1): a guarda anti-rede bloqueia toda requisição não
//   interceptada antes de qualquer transmissão externa, nomeando o destino.
// - Property 18 (14.2): o Mock_API é restaurado ao estado inicial ao fim de
//   cada uso (sem respostas definidas, contadores zerados), de modo que a
//   ordem de execução não altere resultados.
// - SMOKE (14.3): confirma a interceptação total da saída HTTP (9.1) e o uso
//   exclusivo de fixtures inline, sem leitura de fontes externas (9.4).
//
// Contexto de comportamento verificado antes de escrever as asserções:
// - tests/setup.ts instala, em um beforeEach global, uma guarda anti-rede como
//   `fetch` global. Essa guarda LANÇA sincronamente ao ser chamada, nomeando o
//   destino não interceptado — nenhuma conexão real é emitida.
// - web/src/services/api.ts (`request`) envolve a chamada a `fetch` em um
//   try/catch. Tanto um throw síncrono da guarda quanto uma rejeição do stub do
//   Mock_API caem nesse catch, que converte em
//   `throw new ApiError(0, "Não foi possível conectar com o servidor...")`.
//   Em ambos os caminhos nenhuma rede real é tocada — asserir ApiError status 0
//   prova que a requisição foi interrompida antes de qualquer transmissão.
// - Detalhe importante do Vitest + fast-check verificado experimentalmente:
//   `instalarMockFetch` usa `vi.stubGlobal("fetch", ...)` e `restaurar()` usa
//   `vi.unstubAllGlobals()`. Fazer esse ciclo instalar/restaurar MUITAS vezes
//   dentro do laço assíncrono do fast-check (uma vez por iteração) é instável:
//   logo após `restaurar()` restaurar o `fetch` global, ainda há microtasks
//   pendentes da rejeição do `fetch` da iteração corrente; se a próxima
//   iteração instalar um novo stub antes dessas microtasks drenarem, uma
//   chamada "atrasada" acaba contabilizada no stub recém-instalado (observado
//   como "2 chamadas" onde deveria haver 1). Para evitar essa corrida:
//   • Property 17 instala o Mock_API UMA vez (fora do laço) e mede o *delta* de
//     chamadas por iteração — sem churn de stub global entre iterações.
//   • Property 18 precisa exercitar `restaurar()` por iteração (é o que ela
//     valida), então reinstala por iteração MAS drena as microtasks pendentes
//     (uma volta de macrotask) após cada `restaurar()`, eliminando a corrida.
//   A guarda crua (sem Mock_API) é exercitada nos testes SMOKE, cujo beforeEach
//   global garante a guarda intacta.

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { request, ApiError } from "@/services/api";
import { instalarMockFetch } from "../helpers/mockFetch";

// Drena as microtasks/macrotasks pendentes antes de prosseguir. Usado após
// `restaurar()` dentro de laços de propriedade para que qualquer chamada
// assíncrona residual se liquide antes de um novo stub ser instalado.
const drenarTarefasPendentes = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe("Isolamento da suíte (integração)", () => {
  // Feature: testes-frontend, Property 17: Guarda anti-rede bloqueia requisições não interceptadas
  // Validates: Requirements 9.5
  //
  // Para qualquer rota sem resposta configurada, a tentativa de requisição é
  // interrompida antes de qualquer transmissão externa, falhando e indicando o
  // destino não interceptado. Instalamos o Mock_API SEM configurar resposta
  // para a rota arbitrária: o stub rejeita indicando o destino não configurado
  // (método + URL contendo o path), e o Cliente_HTTP converte isso em
  // ApiError(0, ...). Nenhuma conexão real é estabelecida. O Mock_API é
  // instalado UMA vez (fora do laço) e cada iteração mede o *delta* de chamadas,
  // evitando a corrida de instalar/restaurar o stub global a cada iteração.
  it("Property 17: Guarda anti-rede bloqueia requisições não interceptadas", async () => {
    // Caminhos arbitrários, sempre iniciando com "/", compostos por 1..5
    // segmentos de identificador (letras/dígitos/-/_), cobrindo uma variedade
    // de destinos não interceptados sem ambiguidade de espaços em branco.
    const segmento = fc
      .stringMatching(/^[A-Za-z0-9_-]+$/)
      .filter((s) => s.length > 0);
    const pathArbitrario = fc
      .array(segmento, { minLength: 1, maxLength: 5 })
      .map((segmentos) => "/" + segmentos.join("/"));

    // Mock_API instalado SEM configurar resposta para nenhuma rota: toda chamada
    // representa um destino não interceptado e deve ser rejeitada.
    const mock = instalarMockFetch();
    try {
      await fc.assert(
        fc.asyncProperty(pathArbitrario, async (path) => {
          const chamadasAntes = mock.chamadas.length;

          // Resolvemos a requisição a um resultado concreto (sucesso ou erro)
          // sem deixar promessas pendentes: `.then/.catch` garantem liquidação
          // total antes das asserções, evitando rejeições não tratadas durante
          // o shrinking do fast-check.
          const resultado = await request(path)
            .then(() => ({ rejeitou: false, erro: undefined as unknown }))
            .catch((erro: unknown) => ({ rejeitou: true, erro }));

          const deltaChamadas = mock.chamadas.length - chamadasAntes;
          const urlCapturada = mock.ultimaChamada().url;

          // A requisição deve ter sido interrompida (rejeitada) sem tocar a rede.
          expect(resultado.rejeitou).toBe(true);
          // O cliente envolve a rejeição do stub em ApiError(0, ...): prova de
          // que a transmissão externa foi impedida antes de qualquer envio.
          expect(resultado.erro).toBeInstanceOf(ApiError);
          expect((resultado.erro as ApiError).status).toBe(0);
          // Exatamente uma chamada foi registrada nesta iteração e nenhuma rede
          // real foi aberta; o destino capturado nomeia o path não interceptado,
          // com o prefixo "/api".
          expect(deltaChamadas).toBe(1);
          expect(urlCapturada).toBe(`/api${path}`);
        }),
        { numRuns: 100 },
      );
    } finally {
      mock.restaurar();
    }
  });

  // Feature: testes-frontend, Property 18: Independência de ordem de execução
  // Validates: Requirements 9.6
  //
  // Para qualquer sequência de chamadas, o resultado de um teste independe do
  // que rodou antes: ao fim de cada uso o Mock_API é restaurado ao estado
  // inicial (sem respostas definidas, contadores zerados). Cada iteração
  // instala um Mock_API novo, popula `chamadas`, restaura e verifica estado
  // limpo — demonstrando que nenhum estado vaza entre iterações.
  it("Property 18: Independência de ordem de execução", async () => {
    // Quantifica sobre um número arbitrário de chamadas e caminhos arbitrários.
    const segmento = fc
      .stringMatching(/^[A-Za-z0-9_-]+$/)
      .filter((s) => s.length > 0);
    const caminhos = fc.array(
      fc
        .array(segmento, { minLength: 1, maxLength: 3 })
        .map((segmentos) => "/" + segmentos.join("/")),
      { minLength: 1, maxLength: 8 },
    );

    await fc.assert(
      fc.asyncProperty(caminhos, async (rotas) => {
        // Instala um Mock_API novo a cada iteração. Se houvesse vazamento de
        // estado da iteração anterior, as asserções de "estado limpo" abaixo
        // falhariam.
        const mock = instalarMockFetch();
        // Estado inicial de um Mock_API recém-instalado: sem chamadas.
        const chamadasIniciais = mock.chamadas.length;

        // Resposta neutra 204 para que cada chamada complete e seja contada.
        mock.responderCom({ status: 204 });
        for (const rota of rotas) {
          await request(rota);
        }
        // Snapshot do contador populado antes de restaurar.
        const chamadasAposUso = mock.chamadas.length;

        // restaurar() devolve o Mock_API ao estado inicial: contadores zerados.
        mock.restaurar();
        const chamadasAposRestaurar = mock.chamadas.length;
        // Drena microtasks pendentes após restaurar, antes de reinstalar um novo
        // stub, para que nenhuma chamada residual contamine a próxima medição.
        await drenarTarefasPendentes();

        // Um Mock_API recém-instalado após a restauração começa sem respostas
        // configuradas: uma chamada não configurada rejeita (ApiError status 0),
        // provando que nenhuma definição da fase anterior sobreviveu e que o
        // contador recomeça do zero. Liquidamos a promessa com .then/.catch para
        // não deixar rejeições pendentes durante o shrinking do fast-check.
        const mockLimpo = instalarMockFetch();
        const chamadasLimpoIniciais = mockLimpo.chamadas.length;
        const resultadoLimpo = await request(rotas[0])
          .then(() => ({ rejeitou: false, erro: undefined as unknown }))
          .catch((erro: unknown) => ({ rejeitou: true, erro }));
        mockLimpo.restaurar();
        await drenarTarefasPendentes();

        // Estado inicial limpo e contagem fiel ao número de chamadas feitas.
        expect(chamadasIniciais).toBe(0);
        expect(chamadasAposUso).toBe(rotas.length);
        // Restaurar zera os contadores (estado inicial).
        expect(chamadasAposRestaurar).toBe(0);
        // Mock recém-instalado começa limpo e sem respostas configuradas.
        expect(chamadasLimpoIniciais).toBe(0);
        expect(resultadoLimpo.rejeitou).toBe(true);
        expect(resultadoLimpo.erro).toBeInstanceOf(ApiError);
        expect((resultadoLimpo.erro as ApiError).status).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  // Verificação SMOKE de isolamento e fixtures inline.
  // Validates: Requirements 9.1, 9.4
  //
  // Não é teste de propriedade: são asserções de exemplo confirmando que a
  // saída HTTP é totalmente interceptada e que os dados vêm só do próprio teste.
  describe("SMOKE: interceptação total e fixtures inline", () => {
    // Requisito 9.1 — interceptação total da saída HTTP: com Mock_API instalado,
    // `fetch` é um stub controlado (não a rede real); a chamada é capturada em
    // `chamadas`, provando que nenhuma conexão real foi aberta.
    it("intercepta toda saída HTTP com o Mock_API (9.1)", async () => {
      const mock = instalarMockFetch();
      // `fetch` global passou a ser o stub do Mock_API (uma função controlada).
      expect(typeof globalThis.fetch).toBe("function");

      mock.responderCom({ status: 204 });
      await request("/rota-interceptada");

      // A chamada foi capturada pelo stub — nenhuma conexão real foi aberta.
      expect(mock.chamadas.length).toBe(1);
      expect(mock.ultimaChamada().url).toBe("/api/rota-interceptada");

      mock.restaurar();
    });

    // Requisito 9.1 — sem Mock_API, a guarda anti-rede (instalada pelo
    // beforeEach global) impede o fetch real: a chamada é bloqueada e vira
    // ApiError(0, ...), sem qualquer transmissão externa. Este teste não instala
    // Mock_API e, portanto, exercita a guarda crua intacta.
    it("bloqueia fetch real quando não há Mock_API (9.1)", async () => {
      const resultado = await request("/sem-mock")
        .then(() => ({ rejeitou: false, erro: undefined as unknown }))
        .catch((erro: unknown) => ({ rejeitou: true, erro }));

      // A guarda interrompeu a chamada: viramos ApiError(0, ...), sem rede real.
      expect(resultado.rejeitou).toBe(true);
      expect(resultado.erro).toBeInstanceOf(ApiError);
      expect((resultado.erro as ApiError).status).toBe(0);
    });

    // Requisito 9.4 — uso exclusivo de fixtures inline: a resposta vem apenas
    // de um objeto declarado no próprio teste. O valor retornado por `request`
    // é estruturalmente igual a esse objeto inline, provando que a fonte de
    // dados é o teste em si, não uma fonte externa.
    it("responde apenas com fixtures inline declaradas no teste (9.4)", async () => {
      // Fixture inline: a única fonte de dados deste cenário.
      const fixtureInline = {
        id: 42,
        nome: "Empresa Exemplo",
        itens: [1, 2, 3],
        ativo: true,
      };

      const mock = instalarMockFetch();
      mock.responderCom({
        status: 200,
        body: fixtureInline,
        jsonContentType: true,
      });

      const resultado = await request<typeof fixtureInline>("/recurso-inline");

      // O retorno é exatamente a fixture inline — nenhuma leitura externa.
      expect(resultado).toStrictEqual(fixtureInline);

      mock.restaurar();
    });
  });
});
