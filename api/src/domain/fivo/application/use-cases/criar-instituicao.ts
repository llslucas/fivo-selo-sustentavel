import { Either, left, right } from '@core/either';
import { Cnpj } from '@domain/fivo/entities/cnpj';
import { Instituicao } from '@domain/fivo/entities/instituicao';
import { Injectable } from '@nestjs/common';
import { InvalidCnpjError } from '../errors/invalid-cnpj.error';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { InstituicaoAlreadyExistsError } from '../errors/instituicao-already-exists.error';

interface CriarInstituicaoUseCaseRequest {
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

export type CriarInstituicaoUseCaseResponse = Either<
  InstituicaoAlreadyExistsError | InvalidCnpjError,
  {
    instituicao: Instituicao;
  }
>;

@Injectable()
export class CriarInstituicaoUseCase {
  constructor(private readonly instituicaoRepository: InstituicaoRepository) {}

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
  }: CriarInstituicaoUseCaseRequest): Promise<CriarInstituicaoUseCaseResponse> {
    const instituicaoAlreadyExists =
      await this.instituicaoRepository.findByCnpj(cnpj);

    if (instituicaoAlreadyExists) {
      return left(new InstituicaoAlreadyExistsError(cnpj));
    }

    const cnpjOrError = Cnpj.create(cnpj);

    if (cnpjOrError.isLeft()) {
      return left(cnpjOrError.value);
    }

    const instituicao = Instituicao.create({
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

    await this.instituicaoRepository.create(instituicao);

    return right({ instituicao });
  }
}
