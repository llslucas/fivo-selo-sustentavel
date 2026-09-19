import { Either, left, right } from '@core/either';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Cnpj } from '@domain/fivo/entities/cnpj';
import { Empresa, EmpresaStatus } from '@domain/fivo/entities/empresa';
import { Senha } from '@domain/fivo/entities/senha';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { EmpresaAlreadyExistsError } from '../errors/empresa-already-exists.error';
import { InvalidCnpjError } from '../errors/invalid-cnpj.error';
import { SenhaFracaError } from '../errors/senha-fraca.error';
import { UserAlreadyExistsError } from '../errors/users-already-exists.error';
import { Hasher } from '../ports/cryptography/hasher';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { UserRepository } from '../ports/database/user-repository';
import { Mailer, TemplateEmail } from '../ports/mailer';
import { UnitOfWork } from '../ports/unit-of-work';

interface CriarEmpresaUseCaseRequest {
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
  site?: string;
  contato: string;
  logoArquivoId?: string;
}

export type CriarEmpresaUseCaseResponse = Either<
  | SenhaFracaError
  | InvalidCnpjError
  | UserAlreadyExistsError
  | EmpresaAlreadyExistsError,
  {
    empresaId: string;
  }
>;

@Injectable()
export class CriarEmpresaUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly empresaRepository: EmpresaRepository,
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
    logoArquivoId,
  }: CriarEmpresaUseCaseRequest): Promise<CriarEmpresaUseCaseResponse> {
    const senhaOrError = Senha.create(senha);

    if (senhaOrError.isLeft()) {
      return left(senhaOrError.value);
    }

    const cnpjOrError = Cnpj.create(cnpj);

    if (cnpjOrError.isLeft()) {
      return left(cnpjOrError.value);
    }

    const [existingEmpresa, existingUser] = await Promise.all([
      this.empresaRepository.findByCnpj(cnpjOrError.value.valor),
      this.userRepository.findByEmail(email),
    ]);

    const empresaReaproveitavel =
      existingEmpresa &&
      existingEmpresa.status === EmpresaStatus.REJEITADA &&
      existingEmpresa.usuarioId &&
      (!existingUser || existingEmpresa.usuarioId.equals(existingUser.id))
        ? existingEmpresa
        : null;

    if (!empresaReaproveitavel) {
      if (existingUser) {
        return left(new UserAlreadyExistsError());
      }

      if (existingEmpresa) {
        return left(new EmpresaAlreadyExistsError());
      }
    }

    const senhaHash = await senhaOrError.value.hash(this.hasher);

    const usuarioIdParaReaproveitar =
      empresaReaproveitavel?.usuarioId ?? undefined;

    const user = User.create(
      {
        nome: contato,
        email,
        senha: senhaHash,
        role: UserRole.EMPRESA,
      },
      usuarioIdParaReaproveitar,
    );

    const empresa = Empresa.create(
      {
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
        site: site ?? '',
        contato,
        usuarioId: user.id,
        logoArquivoId: logoArquivoId
          ? new UniqueEntityId(logoArquivoId)
          : undefined,
      },
      empresaReaproveitavel?.id,
    );

    await this.unitOfWork.executar(async () => {
      if (empresaReaproveitavel) {
        await this.userRepository.save(user);
        await this.empresaRepository.save(empresa);
      } else {
        await this.userRepository.create(user);
        await this.empresaRepository.create(empresa);
      }
    });

    try {
      await this.mailer.enviar({
        para: email,
        template: TemplateEmail.CADASTRO_RECEBIDO,
      });
    } catch (error) {
      console.error(
        'Falha ao enviar e-mail de confirmação de cadastro de empresa',
        error,
      );
    }

    return right({ empresaId: empresa.id.toString() });
  }
}
