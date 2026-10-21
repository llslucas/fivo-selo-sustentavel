import { Either } from '@core/either';
import { Beneficiada } from './beneficiada';
import { Compromisso } from './compromisso';
import { DataCalendario } from './data-calendario';
import { RegraDoacao, TipoRegraDoacao } from './regra-doacao';
import { Vigencia } from './vigencia';

function valor<E, T>(resultado: Either<E, T>): T {
  if (resultado.isLeft()) {
    throw new Error('Expected a valid value, but got an error');
  }

  return resultado.value;
}

function vigencia(inicio: string, fim?: string): Vigencia {
  return valor(
    Vigencia.criar({
      inicio: valor(DataCalendario.criar(inicio)),
      fim: fim ? valor(DataCalendario.criar(fim)) : undefined,
    }),
  );
}

describe('Compromisso Value Object', () => {
  let beneficiada: Beneficiada;
  let regraDoacao: RegraDoacao;
  let vigenciaBase: Vigencia;
  let compromisso: Compromisso;

  beforeEach(() => {
    beneficiada = valor(Beneficiada.criar({ instituicaoId: 'instituicao-1' }));
    regraDoacao = valor(
      RegraDoacao.criar({ tipo: TipoRegraDoacao.POR_UNIDADE, valor: '1.50' }),
    );
    vigenciaBase = vigencia('2026-01-10', '2026-12-31');

    compromisso = Compromisso.criar({
      beneficiada,
      regraDoacao,
      vigencia: vigenciaBase,
    });
  });

  it('should expose the three fields', () => {
    expect(compromisso.beneficiada).toBe(beneficiada);
    expect(compromisso.regraDoacao).toBe(regraDoacao);
    expect(compromisso.vigencia).toBe(vigenciaBase);
  });

  it('should replace only regraDoacao when merging it', () => {
    const novaRegra = valor(
      RegraDoacao.criar({ tipo: TipoRegraDoacao.PERCENTUAL, percentual: '5' }),
    );

    const mesclado = compromisso.mesclar({ regraDoacao: novaRegra });

    expect(mesclado.regraDoacao).toBe(novaRegra);
    expect(mesclado.beneficiada).toBe(beneficiada);
    expect(mesclado.vigencia).toBe(vigenciaBase);
  });

  it('should keep the original unchanged after merging', () => {
    const novaRegra = valor(
      RegraDoacao.criar({ tipo: TipoRegraDoacao.PERCENTUAL, percentual: '5' }),
    );

    const mesclado = compromisso.mesclar({ regraDoacao: novaRegra });

    expect(mesclado).not.toBe(compromisso);
    expect(compromisso.regraDoacao).toBe(regraDoacao);
    expect(compromisso.beneficiada).toBe(beneficiada);
    expect(compromisso.vigencia).toBe(vigenciaBase);
  });

  it('should consider two compromissos with the same fields equal', () => {
    const outro = Compromisso.criar({
      beneficiada: valor(Beneficiada.criar({ instituicaoId: 'instituicao-1' })),
      regraDoacao: valor(
        RegraDoacao.criar({ tipo: TipoRegraDoacao.POR_UNIDADE, valor: '1.5' }),
      ),
      vigencia: vigencia('2026-01-10', '2026-12-31'),
    });

    expect(compromisso.equals(outro)).toBe(true);
  });

  it('should not be equal when beneficiada differs', () => {
    const outro = compromisso.mesclar({
      beneficiada: valor(Beneficiada.criar({ causaId: 'causa-1' })),
    });

    expect(compromisso.equals(outro)).toBe(false);
  });

  it('should not be equal when regraDoacao differs', () => {
    const outro = compromisso.mesclar({
      regraDoacao: valor(
        RegraDoacao.criar({ tipo: TipoRegraDoacao.POR_UNIDADE, valor: '2' }),
      ),
    });

    expect(compromisso.equals(outro)).toBe(false);
  });

  it('should not be equal when vigencia differs', () => {
    const outro = compromisso.mesclar({
      vigencia: vigencia('2026-01-10'),
    });

    expect(compromisso.equals(outro)).toBe(false);
  });
});
