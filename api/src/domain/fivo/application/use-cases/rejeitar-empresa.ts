import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { User, UserRole } from '@domain/fivo/entities/user';
import { EmpresaRepository } from '../ports/database/empresa-repository';

export class RejeitarEmpresaUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute(empresaId: string, user: User): Promise<void> {
    if (user.role !== UserRole.ADMIN) {
      throw new NotAllowedError();
    }

    const empresa = await this.empresaRepository.findById(empresaId);

    if (!empresa) {
      throw new ResourceNotFoundError('Empresa não encontrada');
    }

    const result = empresa.rejeitar(user, 'Motivo teste');

    if (result.isLeft()) {
      throw result.value;
    }

    await this.empresaRepository.save(empresa);
  }
}
