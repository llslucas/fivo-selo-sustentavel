import { ValueObject } from '@core/types/entities/value-object';

const TAMANHO_MAXIMO = 60;

export type PadraoSlug = 'empresa' | 'campanha';

export class Slug extends ValueObject<{ valor: string }> {
  static de(texto: string, padrao: PadraoSlug): Slug {
    const valor = texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, TAMANHO_MAXIMO)
      .replace(/-+$/, '');

    return new Slug({ valor: valor || padrao });
  }

  static reconstruir(valor: string): Slug {
    return new Slug({ valor });
  }

  get valor(): string {
    return this.props.valor;
  }
}

/** O sufixo vai depois do truncamento, então o resultado pode passar de 60 caracteres. */
export function proximoSlugLivre(base: Slug, ocupados: string[]): Slug {
  const usados = new Set(ocupados);

  if (!usados.has(base.valor)) {
    return base;
  }

  let sufixo = 2;

  while (usados.has(`${base.valor}-${sufixo}`)) {
    sufixo++;
  }

  return Slug.reconstruir(`${base.valor}-${sufixo}`);
}
