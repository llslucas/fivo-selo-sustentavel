import type { OpenAPIObject } from '@nestjs/swagger';

function ordenar(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(ordenar);
  }

  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([chave, item]) => [chave, ordenar(item)]),
    );
  }

  return valor;
}

/** JSON estável (chaves ordenadas) do documento, para versionar em git. */
export function serializarOpenApi(documento: OpenAPIObject): string {
  return `${JSON.stringify(ordenar(documento), null, 2)}\n`;
}
