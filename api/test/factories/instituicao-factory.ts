import { Cnpj } from '@domain/fivo/entities/cnpj';
import {
  Instituicao,
  InstituicaoProps,
} from '@domain/fivo/entities/instituicao';

export class InstituicaoFactory {
  static create(props: Partial<InstituicaoProps> = {}): Instituicao {
    const cnpj = Cnpj.create('12345678000195');

    if (cnpj.isLeft()) {
      throw new Error('Invalid CNPJ');
    }

    const instituicao = Instituicao.create({
      razaoSocial: 'Instituicao Teste LTDA',
      nomeFantasia: 'Instituicao Teste',
      cnpj: cnpj.value,
      telefone: '11999999999',
      cep: '12345678',
      logradouro: 'Rua Teste',
      numero: 123,
      complemento: 'Apto 101',
      bairro: 'Bairro Teste',
      cidade: 'Cidade Teste',
      uf: 'SP',
      site: 'https://www.instituicaoteste.com.br',
      email: 'contato@instituicaoteste.com.br',
      contato: 'João da Silva',
      ...props,
    });

    return instituicao;
  }
}
