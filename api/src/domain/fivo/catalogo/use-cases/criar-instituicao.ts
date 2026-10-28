import { Either, left, right } from '@core/either';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import {
  Cnpj,
  CnpjInvalidoError,
  Mailer,
  TemplateEmail,
  UnitOfWork,
} from '@domain/fivo/shared';
import { DocumentoValidacao } from '../entities/documento-validacao';
import { Instituicao } from '../entities/instituicao';
import {
  Senha,
  User,
  UserRole,
  SenhaFracaError,
  UsuarioJaExisteError,
  Hasher,
  UserRepository,
} from '@domain/fivo/identidade';
import { Injectable } from '@nestjs/common';
import { CausaIndisponivelError } from '../errors/causa-indisponivel.error';
import { DescricaoDocumentoInvalidaError } from '../errors/descricao-documento-invalida.error';
import { DocumentoObrigatorioError } from '../errors/documento-obrigatorio.error';
import { InstituicaoJaExisteError } from '../errors/instituicao-ja-existe.error';
import { CausaRepository } from '../ports/causa-repository';
import { InstituicaoRepository } from '../ports/instituicao-repository';

interface CriarInstituicaoUseCaseRequest {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  senha: string;
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
  logoArquivoId?: string;
}

export type CriarInstituicaoUseCaseResponse = Either<
  | SenhaFracaError
  | CnpjInvalidoError
  | DocumentoObrigatorioError
  | DescricaoDocumentoInvalidaError
  | CausaIndisponivelError
  | UsuarioJaExisteError
  | InstituicaoJaExisteError,
  {
    instituicaoId: string;
  }
>;

@Injectable()
export class CriarInstituicaoUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly instituicaoRepository: InstituicaoRepository,
    private readonly causaRepository: CausaRepository,
    private readonly hasher: Hasher,
    private readonly mailer: Mailer,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute({
    razaoSocial,
    nomeFantasia,
    cnpj,
    email,
    senha,
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
    causaId,
    descricao,
    documentoArquivoId,
    descricaoDocumento,
    logoArquivoId,
  }: CriarInstituicaoUseCaseRequest): Promise<CriarInstituicaoUseCaseResponse> {
    const senhaOrError = Senha.create(senha);

    if (senhaOrError.isLeft()) {
      return left(senhaOrError.value);
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

    const causa = await this.causaRepository.findById(causaId);

    if (!causa || !causa.estaAtiva()) {
      return left(new CausaIndisponivelError());
    }

    // CNPJ é único só entre instituições; e-mail é único na plataforma inteira.
    const [existingInstituicao, existingUser] = await Promise.all([
      this.instituicaoRepository.findByCnpj(cnpjOrError.value.valor),
      this.userRepository.findByEmail(email),
    ]);

    if (existingUser) {
      return left(new UsuarioJaExisteError());
    }

    if (existingInstituicao) {
      return left(new InstituicaoJaExisteError());
    }

    const senhaHash = await senhaOrError.value.hash(this.hasher);

    const user = User.create({
      nome: contato,
      email,
      senha: senhaHash,
      role: UserRole.INSTITUICAO,
    });

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
      usuarioId: user.id,
      causaId: causa.id,
      descricao,
      documento: documentoOrError.value,
      logoArquivoId: logoArquivoId
        ? new UniqueEntityId(logoArquivoId)
        : undefined,
    });

    await this.unitOfWork.executar(async () => {
      await this.userRepository.create(user);
      await this.instituicaoRepository.create(instituicao);
    });

    try {
      await this.mailer.enviar({
        para: email,
        template: TemplateEmail.CADASTRO_RECEBIDO,
      });
    } catch (error) {
      console.error(
        'Falha ao enviar e-mail de confirmação de cadastro de instituição',
        error,
      );
    }

    return right({ instituicaoId: instituicao.id.toString() });
  }
}
