import { InvalidRuleValueError } from '../errors/invalid-rule-value.error';
import { ValorMonetarioInvalidoError } from '../errors/valor-monetario-invalido.error';
import { PercentualInvalidoError } from '../errors/percentual-invalido.error';
import { RegraDoacao, TipoRegraDoacao } from './regra-doacao';

describe('RegraDoacao Value Object', () => {
  it('aceita regra POR_UNIDADE com valor válido', () => {
    const r = RegraDoacao.criar({
      tipo: TipoRegraDoacao.POR_UNIDADE,
      valor: '1.50',
    });
    if (r.isLeft()) throw new Error('esperava sucesso');
    expect(r.value.tipo).toBe(TipoRegraDoacao.POR_UNIDADE);
    expect(r.value.valor?.centavos).toBe(150);
  });

  it('aceita regra PERCENTUAL com percentual válido', () => {
    const r = RegraDoacao.criar({
      tipo: TipoRegraDoacao.PERCENTUAL,
      percentual: '5',
    });
    if (r.isLeft()) throw new Error('esperava sucesso');
    expect(r.value.percentual?.percentual).toBe(500);
  });

  it('POR_UNIDADE sem valor → InvalidRuleValueError', () => {
    const r = RegraDoacao.criar({ tipo: TipoRegraDoacao.POR_UNIDADE });
    expect(r.isLeft()).toBe(true);
    expect(r.value).toBeInstanceOf(InvalidRuleValueError);
  });

  it('POR_UNIDADE com percentual (valor do outro tipo) → InvalidRuleValueError', () => {
    const r = RegraDoacao.criar({
      tipo: TipoRegraDoacao.POR_UNIDADE,
      percentual: '5',
    });
    expect(r.isLeft()).toBe(true);
    expect(r.value).toBeInstanceOf(InvalidRuleValueError);
    expect((r.value as InvalidRuleValueError).status).toBe(422);
    expect((r.value as InvalidRuleValueError).message).toBe(
      'O Valor da regra deve corresponder à regra selecionada.',
    );
  });

  it('PERCENTUAL sem percentual → InvalidRuleValueError', () => {
    const r = RegraDoacao.criar({ tipo: TipoRegraDoacao.PERCENTUAL });
    expect(r.value).toBeInstanceOf(InvalidRuleValueError);
  });

  it('PERCENTUAL com valor (valor do outro tipo) → InvalidRuleValueError', () => {
    const r = RegraDoacao.criar({
      tipo: TipoRegraDoacao.PERCENTUAL,
      valor: '1.50',
    });
    expect(r.isLeft()).toBe(true);
    expect(r.value).toBeInstanceOf(InvalidRuleValueError);
    expect((r.value as InvalidRuleValueError).status).toBe(422);
    expect((r.value as InvalidRuleValueError).message).toBe(
      'O Valor da regra deve corresponder à regra selecionada.',
    );
  });

  it('valor fora do limite → ValorMonetarioInvalidoError', () => {
    const r = RegraDoacao.criar({
      tipo: TipoRegraDoacao.POR_UNIDADE,
      valor: '0',
    });
    expect(r.value).toBeInstanceOf(ValorMonetarioInvalidoError);
  });

  it('percentual fora do limite → PercentualInvalidoError', () => {
    const r = RegraDoacao.criar({
      tipo: TipoRegraDoacao.PERCENTUAL,
      percentual: '0',
    });
    expect(r.value).toBeInstanceOf(PercentualInvalidoError);
  });
});
