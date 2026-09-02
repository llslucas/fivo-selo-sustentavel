import { Cnpj } from '@domain/fivo/entities/cnpj';
import { Empresa, EmpresaProps } from '@domain/fivo/entities/empresa';

export class EmpresaFactory {
  static create(props: Partial<EmpresaProps> = {}): Empresa {
    const cnpj = Cnpj.create('12345678000195');

    if (cnpj.isLeft()) {
      throw new Error('Invalid CNPJ');
    }

    const empresa = Empresa.create({
      razaoSocial: 'Empresa Teste LTDA',
      nomeFantasia: 'Empresa Teste',
      cnpj: cnpj.value,
      telefone: '11999999999',
      cep: '12345678',
      logradouro: 'Rua Teste',
      numero: 123,
      complemento: 'Apto 101',
      bairro: 'Bairro Teste',
      cidade: 'Cidade Teste',
      uf: 'SP',
      site: 'https://www.empresateste.com.br',
      email: 'contato@empresateste.com.br',
      contato: 'João da Silva',
      ...props,
    });

    return empresa;
  }
}
