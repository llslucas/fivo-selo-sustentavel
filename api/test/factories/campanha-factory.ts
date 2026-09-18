import {
  Campanha,
  CampanhaProps,
  RegraType,
} from '@domain/fivo/entities/campanha';
import { EmpresaFactory } from './empresa-factory';
import { InstituicaoFactory } from './instituicao-factory';

export class CampanhaFactory {
  static create(props: Partial<CampanhaProps> = {}): Campanha {
    const empresa = EmpresaFactory.create();
    const instituicao = InstituicaoFactory.create();

    const campanha = Campanha.create({
      empresa,
      instituicao,
      nome: 'Campanha Teste',
      descricao: 'Descrição da Campanha Teste',
      regra_tipo: RegraType.VALOR_FIXO,
      regra_valor_brl: 100,
      regra_percentual: 0,
      meta_valor_brl: 1000,
      data_inicio: new Date(),
      data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ...props,
    });

    return campanha;
  }
}
