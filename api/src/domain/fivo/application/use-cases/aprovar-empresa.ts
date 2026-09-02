import { User, UserType } from '@domain/fivo/entities/user';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';

export class AprovarEmpresaUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute(empresaId: string, user: User): Promise<void> {
    if (user.type !== UserType.ADMIN) {
      throw new NotAllowedError();
    }

    const empresa = await this.empresaRepository.findById(empresaId);

    if (!empresa) {
      throw new ResourceNotFoundError('Empresa não encontrada');
    }

    empresa.status = EmpresaStatus.APROVADA;
    empresa.decidido_por = user;
    empresa.decidido_em = new Date();

    await this.empresaRepository.save(empresa);
  }
}
