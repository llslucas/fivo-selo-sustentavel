// Utilitário de inspeção de FormData para asserção em testes (web/).
//
// Usado para validar a montagem do FormData em `criarEmpresa` (Requisito 5):
// - campos obrigatórios presentes e com valor não vazio (Requisito 5.2);
// - campos opcionais incluídos com o respectivo valor quando informados (5.3);
// - campos opcionais omitidos quando ausentes, nulos ou vazios (5.4).
//
// As asserções usam o `expect` do Vitest para produzir mensagens legíveis
// (esperado × recebido) quando uma verificação falha.

import { expect } from "vitest";

/**
 * Converte um FormData em um mapa inspecionável, de chave para valor.
 *
 * Cada entrada do FormData vira uma propriedade do objeto retornado: valores
 * de texto permanecem como `string`; arquivos (`File`/`Blob`) são preservados
 * como estão. Quando a mesma chave aparece mais de uma vez, a última entrada
 * prevalece — a montagem de `criarEmpresa` não usa chaves repetidas, então
 * esse comportamento é suficiente e previsível para asserção.
 */
export function lerFormData(fd: FormData): Record<string, string | File> {
  const mapa: Record<string, string | File> = {};
  for (const [chave, valor] of fd.entries()) {
    // No ambiente jsdom, entradas não-texto chegam como File.
    mapa[chave] = valor as string | File;
  }
  return mapa;
}

/**
 * Afirma que todas as `chaves` estão presentes no FormData com valor não vazio.
 *
 * Para valores de texto, "não vazio" significa string com ao menos um caractere
 * após `trim()`. Para arquivos, basta a presença da entrada (um `File`/`Blob`).
 */
export function assertCamposPresentes(fd: FormData, chaves: string[]): void {
  const mapa = lerFormData(fd);
  const presentesComValor = Object.keys(mapa).filter((chave) => {
    const valor = mapa[chave];
    if (typeof valor === "string") {
      return valor.trim().length > 0;
    }
    // Qualquer File/Blob presente conta como campo preenchido.
    return valor != null;
  });

  for (const chave of chaves) {
    expect(
      presentesComValor,
      `Esperava o campo "${chave}" presente e não vazio no FormData. ` +
        `Campos com valor não vazio: [${presentesComValor.join(", ")}].`,
    ).toContain(chave);
  }
}

/**
 * Afirma que nenhuma das `chaves` está presente no FormData.
 *
 * Verifica a ausência da entrada em si (campos opcionais omitidos). Se uma
 * chave existir — mesmo que com string vazia — a asserção falha, pois a
 * montagem correta deve omitir o campo, e não incluí-lo vazio.
 */
export function assertCamposAusentes(fd: FormData, chaves: string[]): void {
  const presentes = Array.from(fd.keys());
  for (const chave of chaves) {
    expect(
      fd.has(chave),
      `Esperava o campo "${chave}" ausente do FormData, mas ele está presente. ` +
        `Campos presentes: [${presentes.join(", ")}].`,
    ).toBe(false);
  }
}
