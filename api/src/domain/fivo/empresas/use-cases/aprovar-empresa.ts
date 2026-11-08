import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import {
  TransicaoInvalidaError,
  RegistroAuditoriaRepository,
  Mailer,
  TemplateEmail,
  Slug,
  SlugEmUsoError,
  proximoSlugLivre,
} from '@domain/fivo/shared';
import { User, UserRole, UserRepository } from '@domain/fivo/identidade';
import { Injectable } from '@nestjs/common';
import { Empresa, EmpresaStatus } from '../entities/empresa';
import { EmpresaRepository } from '../ports/empresa-repository';

/** Aprovações simultâneas de homônimas disputam o mesmo slug (VIT-01). */
const TENTATIVAS_DE_SLUG = 3;

type Decisao = Either<
  ResourceNotFoundError | TransicaoInvalidaError,
  { empresa: Empresa; statusAnterior: EmpresaStatus }
>;

export type AprovarEmpresaUseCaseResponse = Either<
  NotAllowedError | ResourceNotFoundError | TransicaoInvalidaError,
  void
>;

@Injectable()
export class AprovarEmpresaUseCase {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly userRepository: UserRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
    private readonly mailer: Mailer,
  ) {}

  async execute(
    empresaId: string,
    user: User,
  ): Promise<AprovarEmpresaUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const decisao = await this.aprovarComSlug(empresaId, user);

    if (decisao.isLeft()) {
      return left(decisao.value);
    }

    const { empresa, statusAnterior } = decisao.value;

    await this.registroAuditoriaRepository.registrar({
      id: randomUUID(),
      tipo: 'EMPRESA_APROVADA',
      descricao: `Empresa ${empresa.razaoSocial} aprovada`,
      usuarioId: user.id.toString(),
      entidadeId: empresa.id.toString(),
      dados: { estadoAnterior: statusAnterior, estadoNovo: empresa.status },
      criadoEm: new Date(),
    });

    const empresaUser = empresa.usuarioId
      ? await this.userRepository.findById(empresa.usuarioId.toString())
      : null;

    if (empresaUser) {
      try {
        await this.mailer.enviar({
          para: empresaUser.email,
          template: TemplateEmail.CADASTRO_APROVADO,
        });
      } catch (error) {
        console.error(
          'Falha ao enviar e-mail de aprovação de cadastro de empresa',
          error,
        );
      }
    }

    return right(undefined);
  }

  /**
   * Em `SlugEmUsoError`, outra aprovação gravou o mesmo slug primeiro: relê a
   * empresa e recalcula o sufixo. Esgotadas as tentativas, o erro sobe.
   */
  private async aprovarComSlug(
    empresaId: string,
    user: User,
  ): Promise<Decisao> {
    for (let tentativa = 1; ; tentativa++) {
      try {
        return await this.tentarAprovar(empresaId, user);
      } catch (error) {
        if (
          !(error instanceof SlugEmUsoError) ||
          tentativa >= TENTATIVAS_DE_SLUG
        ) {
          throw error;
        }
      }
    }
  }

  private async tentarAprovar(empresaId: string, user: User): Promise<Decisao> {
    const empresa = await this.empresaRepository.findById(empresaId);

    if (!empresa) {
      return left(new ResourceNotFoundError('Empresa não encontrada'));
    }

    const statusAnterior = empresa.status;
    const result = empresa.aprovar(user.id);

    if (result.isLeft()) {
      return left(result.value);
    }

    if (!empresa.slug) {
      const base = Slug.de(empresa.nomeFantasia, 'empresa');
      const ocupados = await this.empresaRepository.listarSlugsComPrefixo(
        base.valor,
      );
      empresa.atribuirSlug(proximoSlugLivre(base, ocupados));
    }

    const aplicada = await this.empresaRepository.salvarTransicao(
      empresa,
      statusAnterior,
    );

    if (!aplicada) {
      return left(new TransicaoInvalidaError());
    }

    return right({ empresa, statusAnterior });
  }
}
