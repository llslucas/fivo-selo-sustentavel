import { Either, left, right } from '@core/either';
import { Cnpj } from '@domain/fivo/entities/cnpj';
import { Empresa } from '@domain/fivo/entities/empresa';
import { Injectable } from '@nestjs/common';
import { CnpjInvalidoError } from '../errors/cnpj-invalido-error';
import { EmpresaAlreadyExistsError } from '../errors/empresa-already-exists.error';
import { EmpresaRepository } from '../ports/database/empresa-repository';

interface CriarEmpresaUseCaseRequest {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: number;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  site: string;
  email: string;
  contato: string;
}

export type CriarEmpresaUseCaseResponse = Either<
  EmpresaAlreadyExistsError | CnpjInvalidoError,
  {
    empresa: Empresa;
  }
>;

@Injectable()
export class CriarEmpresaUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute({
    razaoSocial,
    nomeFantasia,
    cnpj,
    telefone,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    site,
    email,
    contato,
  }: CriarEmpresaUseCaseRequest): Promise<CriarEmpresaUseCaseResponse> {
    const empresaAlreadyExists = await this.empresaRepository.findByCnpj(cnpj);

    if (empresaAlreadyExists) {
      return left(new EmpresaAlreadyExistsError(cnpj));
    }

    const cnpjOrError = Cnpj.create(cnpj);

    if (cnpjOrError.isLeft()) {
      return left(cnpjOrError.value);
    }

    const empresa = Empresa.create({
      razaoSocial,
      nomeFantasia,
      cnpj: cnpjOrError.value,
      telefone,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      site,
      email,
      contato,
    });

    await this.empresaRepository.create(empresa);

    return right({ empresa });
  }
}
