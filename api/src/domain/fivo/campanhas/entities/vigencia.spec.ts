import { DataCalendario } from './data-calendario';
import { Vigencia } from './vigencia';
import { VigenciaInvalidaError } from '../errors/vigencia-invalida.error';

function data(texto: string): DataCalendario {
  const r = DataCalendario.criar(texto);
  if (r.isLeft()) throw new Error('data de teste inválida: ' + texto);
  return r.value;
}

describe('Vigencia Value Object', () => {
  it('fim igual ao início → erro', () => {
    const r = Vigencia.criar({
      inicio: data('2026-01-10'),
      fim: data('2026-01-10'),
    });
    expect(r.isLeft()).toBe(true);
    expect(r.value).toBeInstanceOf(VigenciaInvalidaError);
  });

  it('fim um dia antes do início → erro 422 com a mensagem da vigência', () => {
    const r = Vigencia.criar({
      inicio: data('2026-01-10'),
      fim: data('2026-01-09'),
    });
    expect(r.isLeft()).toBe(true);
    expect(r.value).toBeInstanceOf(VigenciaInvalidaError);
    const erro = r.value as VigenciaInvalidaError;
    expect(erro.status).toBe(422);
    expect(erro.message).toBe(
      'A data de fim deve ser posterior à data de início',
    );
  });

  it('fim um dia depois → aceito', () => {
    const r = Vigencia.criar({
      inicio: data('2026-01-10'),
      fim: data('2026-01-11'),
    });
    expect(r.isRight()).toBe(true);
  });

  it('sem fim → aceito', () => {
    const r = Vigencia.criar({ inicio: data('2026-01-10') });
    expect(r.isRight()).toBe(true);
  });

  it('início em 2020 (passado) → aceito', () => {
    const r = Vigencia.criar({ inicio: data('2020-01-01') });
    expect(r.isRight()).toBe(true);
  });

  it('fimJaPassouEm: antes, igual e depois de hoje', () => {
    const hoje = data('2026-06-15');
    const comFim = (fim: string) => {
      const r = Vigencia.criar({ inicio: data('2026-01-01'), fim: data(fim) });
      if (r.isLeft()) throw new Error('esperava sucesso');
      return r.value;
    };
    expect(comFim('2026-06-14').fimJaPassouEm(hoje)).toBe(true); // antes
    expect(comFim('2026-06-15').fimJaPassouEm(hoje)).toBe(true); // igual
    expect(comFim('2026-06-16').fimJaPassouEm(hoje)).toBe(false); // depois

    const semFim = Vigencia.criar({ inicio: data('2026-01-01') });
    if (semFim.isLeft()) throw new Error('esperava sucesso');
    expect(semFim.value.fimJaPassouEm(hoje)).toBe(false);
  });

  it('naoIniciadaEm: antes, igual e depois de hoje', () => {
    const hoje = data('2026-06-15');
    const comInicio = (inicio: string) => {
      const r = Vigencia.criar({ inicio: data(inicio) });
      if (r.isLeft()) throw new Error('esperava sucesso');
      return r.value;
    };
    expect(comInicio('2026-06-14').naoIniciadaEm(hoje)).toBe(false);
    expect(comInicio('2026-06-15').naoIniciadaEm(hoje)).toBe(false);
    expect(comInicio('2026-06-16').naoIniciadaEm(hoje)).toBe(true);
  });
});
