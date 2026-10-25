// Testes condicionais do serviço opcional `comprovantes.ts` (Requisito 7.5).
//
// O serviço de comprovantes ainda NÃO existe em `web/src/services` — ele depende
// de uma task futura. Por isso, todo o bloco abaixo é guardado por
// `describe.skipIf(!servicoExiste("comprovantes.ts"))`: enquanto o arquivo não
// existir, o bloco é PULADO e não quebra a suíte. Assim que `comprovantes.ts`
// passar a existir no disco, estes testes passam a rodar automaticamente.
//
// Cobertura exigida (Requisito 7.5): para as operações de LISTAGEM e ENVIO de
// comprovantes, exercitar ao menos 1 sucesso (2xx) e 1 falha (4xx/5xx) por
// operação, afirmando o resultado retornado (ou o erro lançado).
//
// IMPORTANTE — contrato ainda indefinido: como o módulo não existe hoje, não
// conhecemos os nomes exatos dos exports nem a forma precisa de entrada/saída.
// Os testes abaixo são defensivos: descobrem a função relevante por candidatos
// de nome e, quando o módulo existir, deve-se CONFIRMAR/AJUSTAR as asserções
// marcadas com "AO IMPLEMENTAR" para refletir o contrato real do serviço.

import { describe, test, expect, afterEach } from "vitest";
import { servicoExiste, importarSeExistir } from "../helpers/moduleExists";
import { instalarMockFetch, type MockFetch } from "../helpers/mockFetch";
import { ApiError } from "@/services/api";

// Tipo frouxo do módulo: não sabemos os nomes exatos dos exports até o serviço
// existir. Tratamos o módulo como um dicionário de funções e localizamos a
// operação desejada por uma lista de nomes candidatos (em pt-BR e en).
type ModuloComprovantes = Record<string, unknown>;

// Nomes candidatos para a operação de LISTAGEM de comprovantes.
const CANDIDATOS_LISTAGEM = [
  "listarComprovantes",
  "listar",
  "obterComprovantes",
  "buscarComprovantes",
  "getComprovantes",
  "listComprovantes",
];

// Nomes candidatos para a operação de ENVIO de comprovante.
const CANDIDATOS_ENVIO = [
  "enviarComprovante",
  "enviar",
  "criarComprovante",
  "uploadComprovante",
  "enviarComprovantes",
  "postComprovante",
];

// Localiza a primeira função exportada cujo nome bate com os candidatos.
function encontrarOperacao(
  modulo: ModuloComprovantes,
  candidatos: string[],
): ((...args: unknown[]) => unknown) | null {
  for (const nome of candidatos) {
    const valor = modulo[nome];
    if (typeof valor === "function") {
      return valor as (...args: unknown[]) => unknown;
    }
  }
  return null;
}

describe.skipIf(!servicoExiste("comprovantes.ts"))("comprovantes", () => {
  let mock: MockFetch;

  afterEach(() => {
    // Restaura o fetch e zera definições/contadores entre testes. O afterEach
    // global também desfaz stubs; este restaurar() mantém o isolamento mesmo
    // que o fluxo abaixo instale o mock mais de uma vez.
    mock?.restaurar();
  });

  // ------------------------------------------------------------------
  // LISTAGEM — ao menos 1 sucesso (2xx) e 1 falha (4xx/5xx).
  // ------------------------------------------------------------------

  test("listagem: sucesso 2xx retorna a lista de comprovantes", async () => {
    mock = instalarMockFetch();

    // Fixture inline representando um corpo 2xx plausível para a listagem.
    // AO IMPLEMENTAR: ajustar o shape para o contrato real (ex.: paginação,
    // envelope { dados: [...] }, etc.) e afirmar o valor exato retornado.
    const comprovantes = [
      { id: "1", nome: "comprovante-1.pdf", status: "pendente" },
      { id: "2", nome: "comprovante-2.pdf", status: "aprovado" },
    ];
    mock.responderCom({ status: 200, body: comprovantes });

    const modulo = await importarSeExistir<ModuloComprovantes>(
      "comprovantes.ts",
    );
    // Guarda defensiva: o skipIf já garante existência; isto satisfaz o tipo.
    expect(modulo).not.toBeNull();

    const listar = encontrarOperacao(modulo!, CANDIDATOS_LISTAGEM);
    expect(
      listar,
      `Nenhuma função de listagem encontrada em comprovantes.ts. ` +
        `Candidatos verificados: ${CANDIDATOS_LISTAGEM.join(", ")}. ` +
        `AO IMPLEMENTAR: adicione o nome real à lista CANDIDATOS_LISTAGEM.`,
    ).not.toBeNull();

    const resultado = await listar!();

    // Afirma que a operação devolveu os dados do corpo 2xx. AO IMPLEMENTAR:
    // substituir por asserção estrita do contrato real (ex.: toEqual exato).
    expect(resultado).toBeDefined();
    expect(resultado).toEqual(comprovantes);

    // O Cliente_HTTP sempre prefixa "/api"; a chamada deve ter ocorrido.
    expect(mock.chamadas.length).toBeGreaterThan(0);
    expect(mock.ultimaChamada().url).toContain("/api");
  });

  test("listagem: falha 4xx/5xx lança ApiError com o status propagado", async () => {
    mock = instalarMockFetch();

    // 500 é uma falha de servidor típica para a listagem.
    mock.responderCom({
      status: 500,
      body: { statusCode: 500, message: "Erro ao listar comprovantes." },
    });

    const modulo = await importarSeExistir<ModuloComprovantes>(
      "comprovantes.ts",
    );
    expect(modulo).not.toBeNull();

    const listar = encontrarOperacao(modulo!, CANDIDATOS_LISTAGEM);
    expect(listar).not.toBeNull();

    // AO IMPLEMENTAR: se o serviço tratar o erro de outra forma (ex.: retornar
    // um Result em vez de lançar), ajustar esta asserção ao comportamento real.
    const erro = await Promise.resolve(listar!()).then(
      () => null,
      (e: unknown) => e,
    );
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(500);
  });

  // ------------------------------------------------------------------
  // ENVIO — ao menos 1 sucesso (2xx) e 1 falha (4xx/5xx).
  // ------------------------------------------------------------------

  test("envio: sucesso 2xx retorna o comprovante criado", async () => {
    mock = instalarMockFetch();

    // Fixture inline do comprovante criado. AO IMPLEMENTAR: ajustar o shape e
    // afirmar o valor exato conforme o contrato real do serviço.
    const criado = { id: "99", nome: "novo-comprovante.pdf", status: "pendente" };
    mock.responderCom({ status: 201, body: criado });

    const modulo = await importarSeExistir<ModuloComprovantes>(
      "comprovantes.ts",
    );
    expect(modulo).not.toBeNull();

    const enviar = encontrarOperacao(modulo!, CANDIDATOS_ENVIO);
    expect(
      enviar,
      `Nenhuma função de envio encontrada em comprovantes.ts. ` +
        `Candidatos verificados: ${CANDIDATOS_ENVIO.join(", ")}. ` +
        `AO IMPLEMENTAR: adicione o nome real à lista CANDIDATOS_ENVIO.`,
    ).not.toBeNull();

    // Entrada defensiva: a maioria dos envios de comprovante usa FormData com
    // o arquivo. AO IMPLEMENTAR: ajustar os argumentos conforme a assinatura
    // real da função (ex.: campos adicionais, id da empresa, etc.).
    const form = new FormData();
    form.append(
      "arquivo",
      new Blob(["conteudo"], { type: "application/pdf" }),
      "novo-comprovante.pdf",
    );

    const resultado = await enviar!(form);

    expect(resultado).toBeDefined();
    expect(resultado).toEqual(criado);

    expect(mock.chamadas.length).toBeGreaterThan(0);
    expect(mock.ultimaChamada().url).toContain("/api");
  });

  test("envio: falha 4xx/5xx lança ApiError com o status propagado", async () => {
    mock = instalarMockFetch();

    // 422 é uma falha de validação típica no envio.
    mock.responderCom({
      status: 422,
      body: {
        statusCode: 422,
        message: "Comprovante inválido.",
        errors: [{ campo: "arquivo", mensagem: "Formato não suportado." }],
      },
    });

    const modulo = await importarSeExistir<ModuloComprovantes>(
      "comprovantes.ts",
    );
    expect(modulo).not.toBeNull();

    const enviar = encontrarOperacao(modulo!, CANDIDATOS_ENVIO);
    expect(enviar).not.toBeNull();

    const form = new FormData();
    form.append(
      "arquivo",
      new Blob(["conteudo"], { type: "text/plain" }),
      "invalido.txt",
    );

    // AO IMPLEMENTAR: confirmar que o serviço propaga o ApiError (status 422) e,
    // se aplicável, que `fieldErrors` carrega os erros por campo retornados.
    const erro = await Promise.resolve(enviar!(form)).then(
      () => null,
      (e: unknown) => e,
    );
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).status).toBe(422);
  });
});
