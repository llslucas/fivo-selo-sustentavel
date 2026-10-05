import { Either, left, right } from '@core/either';
import { Cnpj } from '@domain/fivo/entities/cnpj';
import { DocumentoValidacao } from '@domain/fivo/entities/documento-validacao';
import { Instituicao } from '@domain/fivo/entities/instituicao';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Injectable } from '@nestjs/common';
import { InvalidCnpjError } from '../errors/invalid-cnpj.error';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { InstituicaoAlreadyExistsError } from '../errors/instituicao-already-exists.error';
import { DocumentoObrigatorioError } from '../errors/documento-obrigatorio.error';
import { DescricaoDocumentoInvalidaError } from '../errors/descricao-documento-invalida.error';

interface CriarInstituicaoUseCaseRequest {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  site: string;
  contato: string;
  causaId: string;
  descricao: string;
  documentoArquivoId: string;
  descricaoDocumento?: string | null;
}

export type CriarInstituicaoUseCaseResponse = Either<
  | InstituicaoAlreadyExistsError
  | InvalidCnpjError
  | DocumentoObrigatorioError
  | DescricaoDocumentoInvalidaError,
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
    causaId,
    descricao,
    documentoArquivoId,
    descricaoDocumento,
    contato,
  }: CriarInstituicaoUseCaseRequest): Promise<CriarInstituicaoUseCaseResponse> {
    const instituicaoAlreadyExists =
      await this.instituicaoRepository.findByCnpj(cnpj);

    if (instituicaoAlreadyExists) {
      return left(new InstituicaoAlreadyExistsError());
    }

    const cnpjOrError = Cnpj.create(cnpj);

    if (cnpjOrError.isLeft()) {
      return left(cnpjOrError.value);
    }

    const documentoOrError = DocumentoValidacao.criar(
      documentoArquivoId,
      descricaoDocumento,
    );

    if (documentoOrError.isLeft()) {
      return left(documentoOrError.value);
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
      contato,
      causaId: new UniqueEntityId(causaId),
      descricao,
      documento: documentoOrError.value,
    });

    await this.instituicaoRepository.create(instituicao);

    return right({ instituicao });
  }
}
