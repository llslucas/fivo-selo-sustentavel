import { User, UserRole } from '@domain/fivo/entities/user';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';

export class RejeitarInstituicaoUseCase {
  constructor(private readonly instituicaoRepository: InstituicaoRepository) {}

  async execute(instituicaoId: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new NotAllowedError();
    }

    const instituicao =
      await this.instituicaoRepository.findById(instituicaoId);

    if (!instituicao) {
      throw new ResourceNotFoundError('Instituicao não encontrada');
    }

    instituicao.status = InstituicaoStatus.REJEITADA;
    instituicao.decidido_por = user;
    instituicao.decidido_em = new Date();

    await this.instituicaoRepository.save(instituicao);
  }
}
