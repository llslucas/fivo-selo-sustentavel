import { Either, left, right } from '@core/either';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import {
  Cnpj,
  CnpjInvalidoError,
  Mailer,
  TemplateEmail,
  UnitOfWork,
} from '@domain/fivo/shared';
import { Empresa, EmpresaStatus } from '../entities/empresa';
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
import { EmpresaJaExisteError } from '../errors/empresa-ja-existe.error';
import { EmpresaRepository } from '../ports/empresa-repository';

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
  | CnpjInvalidoError
  | UsuarioJaExisteError
  | EmpresaJaExisteError,
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
        return left(new UsuarioJaExisteError());
      }

      if (existingEmpresa) {
        return left(new EmpresaJaExisteError());
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
        const aplicada = await this.empresaRepository.salvarTransicao(
          empresa,
          EmpresaStatus.REJEITADA,
        );

        // Outro re-cadastro venceu a corrida: desfaz a escrita do usuário.
        if (!aplicada) {
          throw new EmpresaJaExisteError();
        }
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
