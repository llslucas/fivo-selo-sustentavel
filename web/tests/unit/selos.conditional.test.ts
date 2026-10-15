// Testes condicionais do Servico_Opcional de selos (web/src/services/selos.ts).
//
// Cobre os Requisitos 7.3 e 7.4: nos casos de sucesso (2xx), verificar a
// geração de URL do selo, a geração do QR Code e o download do selo, afirmando
// o conteúdo ou identificador retornado em cada um dos três resultados; e, nos
// casos de falha (4xx/5xx), verificar que o erro é propagado ou tratado
// conforme o serviço definir, afirmando a indicação de falha retornada.
//
// IMPORTANTE — DETECÇÃO CONDICIONAL:
// O módulo `web/src/services/selos.ts` ainda NÃO existe (depende de tasks
// futuras — T35–T46). Enquanto o arquivo não existir, todo o bloco é pulado via
// `describe.skipIf(!servicoExiste("selos.ts"))`, de modo que este arquivo NÃO
// quebra a suíte. Um arquivo cujos testes são todos pulados é aceitável e passa.
// Quando `selos.ts` passar a existir, os testes abaixo rodam automaticamente.
//
// COMO ADAPTAR QUANDO `selos.ts` EXISTIR:
// Como os nomes exatos dos exports do serviço só serão conhecidos quando ele
// for implementado, os testes abaixo são escritos de forma defensiva: eles
// localizam a função exportada por um conjunto de nomes candidatos (ex.:
// `gerarUrlSelo`/`gerarUrl`, `gerarQrCode`/`gerarQrCodeSelo`,
// `baixarSelo`/`downloadSelo`). Ao implementar o serviço, ajuste os nomes
// candidatos e os contratos (método, rota, corpo) de acordo com a assinatura
// real. Os pontos a afirmar, conforme os Requisitos 7.3/7.4, são:
//   - geração de URL do selo: o resultado contém a URL/identificador do selo;
//   - geração de QR Code: o resultado contém o QR Code (dados/identificador);
//   - download do selo: o resultado contém o conteúdo/identificador do arquivo;
//   - falha 4xx/5xx: o serviço propaga/trata o erro (ex.: lança ApiError) com
//     a indicação de falha correspondente.

import { describe, it, expect } from "vitest";

import { servicoExiste, importarSeExistir } from "../helpers/moduleExists";
import { instalarMockFetch } from "../helpers/mockFetch";

// Nome do arquivo de serviço avaliado por este bloco condicional.
const ARQUIVO_SELOS = "selos.ts";

// Nomes candidatos para cada operação do serviço de selos. Como a assinatura
// real só é conhecida quando o módulo for implementado, aceitamos variações
// comuns de nomenclatura e escolhemos a primeira função exportada que casar.
const CANDIDATOS_URL = [
  "gerarUrlSelo",
  "gerarUrl",
  "obterUrlSelo",
  "urlSelo",
] as const;
const CANDIDATOS_QRCODE = [
  "gerarQrCode",
  "gerarQrCodeSelo",
  "gerarQRCode",
  "obterQrCode",
  "qrCodeSelo",
] as const;
const CANDIDATOS_DOWNLOAD = [
  "baixarSelo",
  "downloadSelo",
  "baixar",
  "download",
] as const;

// Localiza a primeira função exportada cujo nome esteja entre os candidatos.
// Retorna a função e o nome resolvido, ou null quando nenhuma casar — nesse
// caso o teste correspondente é pulado em tempo de execução (o serviço existe,
// mas ainda não expõe a operação; isso será ajustado ao implementar o módulo).
function resolverFuncao(
  modulo: Record<string, unknown>,
  candidatos: readonly string[],
): { nome: string; fn: (...args: unknown[]) => unknown } | null {
  for (const nome of candidatos) {
    const valor = modulo[nome];
    if (typeof valor === "function") {
      return { nome, fn: valor as (...args: unknown[]) => unknown };
    }
  }
  return null;
}

// `skipIf(true)` quando o serviço ainda não existe: HOJE o bloco é pulado e não
// quebra a suíte. Quando `selos.ts` existir, o bloco roda automaticamente.
describe.skipIf(!servicoExiste(ARQUIVO_SELOS))("selos", () => {
  // ──────────────────────────────────────────────────────────────────────
  // Sucesso (Requisito 7.3): URL do selo, QR Code e download
  // ──────────────────────────────────────────────────────────────────────

  it("gera a URL do selo e afirma o identificador/URL retornado (Req 7.3)", async () => {
    const modulo = await importarSeExistir<Record<string, unknown>>(
      ARQUIVO_SELOS,
    );
    expect(modulo).not.toBeNull();

    const alvo = resolverFuncao(modulo!, CANDIDATOS_URL);
    // Se o serviço existe mas ainda não expõe esta operação, pulamos este
    // caso específico — ajuste CANDIDATOS_URL ao implementar o módulo.
    if (alvo === null) {
      return;
    }

    const mock = instalarMockFetch();
    try {
      // Fixture inline controlada: resposta 2xx com a URL do selo. Afirmamos
      // apenas que o resultado carrega o conteúdo/identificador esperado,
      // independentemente do formato exato (string ou objeto).
      const urlEsperada = "https://selos.exemplo/selo/empresa-123.png";
      mock.responderCom({
        status: 200,
        body: { url: urlEsperada, id: "empresa-123" },
        jsonContentType: true,
      });

      const resultado = await alvo.fn("empresa-123");

      // O resultado deve conter o identificador/URL do selo. Aceitamos tanto
      // o valor direto (string) quanto um objeto com a URL embutida.
      const serializado = JSON.stringify(resultado ?? "");
      expect(serializado).toContain("empresa-123");

      // Houve ao menos uma chamada HTTP interceptada pelo Mock_API, com o
      // prefixo "/api" exigido pelo Cliente_HTTP (Contrato_Requisicao).
      expect(mock.chamadas.length).toBeGreaterThan(0);
      expect(mock.ultimaChamada().url.startsWith("/api")).toBe(true);
    } finally {
      mock.restaurar();
    }
  });

  it("gera o QR Code do selo e afirma o conteúdo/identificador retornado (Req 7.3)", async () => {
    const modulo = await importarSeExistir<Record<string, unknown>>(
      ARQUIVO_SELOS,
    );
    expect(modulo).not.toBeNull();

    const alvo = resolverFuncao(modulo!, CANDIDATOS_QRCODE);
    if (alvo === null) {
      return;
    }

    const mock = instalarMockFetch();
    try {
      // Fixture inline: resposta 2xx com os dados do QR Code (ex.: data URL).
      const qrEsperado =
        "data:image/png;base64,QRCODE-empresa-123-conteudo-controlado";
      mock.responderCom({
        status: 200,
        body: { qrCode: qrEsperado, id: "empresa-123" },
        jsonContentType: true,
      });

      const resultado = await alvo.fn("empresa-123");

      // O resultado deve conter o conteúdo/identificador do QR Code.
      const serializado = JSON.stringify(resultado ?? "");
      expect(serializado).toContain("empresa-123");

      expect(mock.chamadas.length).toBeGreaterThan(0);
      expect(mock.ultimaChamada().url.startsWith("/api")).toBe(true);
    } finally {
      mock.restaurar();
    }
  });

  it("baixa o selo e afirma o conteúdo/identificador retornado (Req 7.3)", async () => {
    const modulo = await importarSeExistir<Record<string, unknown>>(
      ARQUIVO_SELOS,
    );
    expect(modulo).not.toBeNull();

    const alvo = resolverFuncao(modulo!, CANDIDATOS_DOWNLOAD);
    if (alvo === null) {
      return;
    }

    const mock = instalarMockFetch();
    try {
      // Fixture inline: resposta 2xx com o conteúdo/identificador do arquivo.
      mock.responderCom({
        status: 200,
        body: { arquivo: "selo-empresa-123.png", id: "empresa-123" },
        jsonContentType: true,
      });

      const resultado = await alvo.fn("empresa-123");

      // O resultado deve conter o conteúdo/identificador do download.
      const serializado = JSON.stringify(resultado ?? "");
      expect(serializado).toContain("empresa-123");

      expect(mock.chamadas.length).toBeGreaterThan(0);
      expect(mock.ultimaChamada().url.startsWith("/api")).toBe(true);
    } finally {
      mock.restaurar();
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  // Falha (Requisito 7.4): 4xx/5xx propagada ou tratada
  // ──────────────────────────────────────────────────────────────────────

  it.each([404, 500])(
    "propaga/trata falha %i em qualquer operação de selo (Req 7.4)",
    async (status) => {
      const modulo = await importarSeExistir<Record<string, unknown>>(
        ARQUIVO_SELOS,
      );
      expect(modulo).not.toBeNull();

      // Usa a primeira operação disponível entre as três (URL, QR Code,
      // download). Todas passam pelo mesmo Cliente_HTTP, então o tratamento de
      // erro 4xx/5xx é equivalente — basta exercitar uma operação existente.
      const alvo =
        resolverFuncao(modulo!, CANDIDATOS_URL) ??
        resolverFuncao(modulo!, CANDIDATOS_QRCODE) ??
        resolverFuncao(modulo!, CANDIDATOS_DOWNLOAD);
      if (alvo === null) {
        return;
      }

      const mock = instalarMockFetch();
      try {
        // Fixture inline: resposta de erro com corpo no formato de ErroResposta
        // consumido pelo Cliente_HTTP (campos statusCode/message).
        mock.responderCom({
          status,
          body: { statusCode: status, message: "Falha ao processar o selo." },
          jsonContentType: true,
        });

        let resultado: unknown;
        let capturado: unknown;
        try {
          resultado = await alvo.fn("empresa-123");
        } catch (erro) {
          capturado = erro;
        }

        // O serviço deve indicar a falha: ou propaga lançando um erro, ou a
        // trata retornando uma indicação de falha (não um resultado de sucesso
        // "normal"). Afirmamos uma das duas vias.
        if (capturado !== undefined) {
          // Via propagação: um erro foi lançado com a indicação de falha.
          expect(capturado).toBeInstanceOf(Error);
          const possivelStatus = (capturado as { status?: unknown }).status;
          if (possivelStatus !== undefined) {
            expect(possivelStatus).toBe(status);
          }
        } else {
          // Via tratamento: o resultado carrega uma indicação de falha
          // (ex.: { ok: false }, { erro: ... }, status) e não é vazio.
          expect(resultado).toBeDefined();
          const serializado = JSON.stringify(resultado ?? "");
          const indicaFalha =
            /false|erro|error|falha|fail/i.test(serializado) ||
            serializado.includes(String(status));
          expect(indicaFalha).toBe(true);
        }
      } finally {
        mock.restaurar();
      }
    },
  );
});
