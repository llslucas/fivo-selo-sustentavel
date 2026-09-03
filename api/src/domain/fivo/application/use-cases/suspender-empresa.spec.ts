import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UserRole } from '@domain/fivo/entities/user';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { SuspenderEmpresaUseCase } from './suspender-empresa';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';

describe('SuspenderEmpresaUseCase', () => {
  let suspenderEmpresaUseCase: SuspenderEmpresaUseCase;
  let empresaRepository: EmpresaRepository;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    suspenderEmpresaUseCase = new SuspenderEmpresaUseCase(empresaRepository);
  });

  it('should suspend an existing empresa if the user is an admin', async () => {
    const mockUser = UserFactory.create({ role: UserRole.ADMIN });

    const mockEmpresa = EmpresaFactory.create();
    await empresaRepository.create(mockEmpresa);

    await suspenderEmpresaUseCase.execute(mockEmpresa.id.toString(), mockUser);

    const updatedEmpresa = await empresaRepository.findById(
      mockEmpresa.id.toString(),
    );

    expect(updatedEmpresa?.status).toBe(EmpresaStatus.SUSPENSA);
    expect(updatedEmpresa?.decidido_por).toEqual(mockUser);
  });

  it('should throw a NotAllowedError if the user is not an admin', async () => {
    const mockUser = UserFactory.create({ role: UserRole.EMPRESA });

    const mockEmpresa = EmpresaFactory.create();
    await empresaRepository.create(mockEmpresa);

    await expect(
      suspenderEmpresaUseCase.execute(mockEmpresa.id.toString(), mockUser),
    ).rejects.toThrow(NotAllowedError);
  });

  it('should throw a ResourceNotFound Error if the empresa not exists.', async () => {
    const mockUser = UserFactory.create({ role: UserRole.ADMIN });

    await expect(
      suspenderEmpresaUseCase.execute('non-existent-id', mockUser),
    ).rejects.toThrow(ResourceNotFoundError);
  });
});
