import { Cnpj } from '@domain/fivo/entities/cnpj';
import { DocumentoValidacao } from '@domain/fivo/entities/documento-validacao';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
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

    const documento = DocumentoValidacao.criar('arquivo-documento-teste');

    if (documento.isLeft()) {
      throw documento.value;
    }

    const instituicao = Instituicao.create({
      razaoSocial: 'Instituicao Teste LTDA',
      nomeFantasia: 'Instituicao Teste',
      cnpj: cnpj.value,
      telefone: '11999999999',
      cep: '12345678',
      logradouro: 'Rua Teste',
      numero: '123',
      complemento: 'Apto 101',
      bairro: 'Bairro Teste',
      cidade: 'Cidade Teste',
      uf: 'SP',
      site: 'https://www.instituicaoteste.com.br',
      contato: 'João da Silva',
      usuarioId: new UniqueEntityId(),
      causaId: new UniqueEntityId(),
      descricao: 'Descricao da instituicao de teste',
      documento: documento.value,
      ...props,
    });

    return instituicao;
  }
}
