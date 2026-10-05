import { User, UserRole } from '@domain/fivo/entities/user';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';

export class RejeitarInstituicaoUseCase {
  constructor(private readonly instituicaoRepository: InstituicaoRepository) {}

  async execute(
    instituicaoId: string,
    user: User,
    motivo: string,
  ): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new NotAllowedError();
    }

    const instituicao =
      await this.instituicaoRepository.findById(instituicaoId);

    if (!instituicao) {
      throw new ResourceNotFoundError('Instituicao não encontrada');
    }

    const statusAnterior = instituicao.status;
    const resultado = instituicao.rejeitar(user.id, motivo);

    if (resultado.isLeft()) {
      throw resultado.value;
    }

    const aplicada = await this.instituicaoRepository.salvarTransicao(
      instituicao,
      statusAnterior,
    );

    if (!aplicada) {
      throw new TransicaoInvalidaError();
    }
  }
}
