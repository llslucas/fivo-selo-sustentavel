import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UserType } from '@domain/fivo/entities/user';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { AprovarEmpresaUseCase } from './aprovar-empresa';

describe('AprovarEmpresaUseCase', () => {
  let aprovarEmpresaUseCase: AprovarEmpresaUseCase;
  let empresaRepository: EmpresaRepository;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    aprovarEmpresaUseCase = new AprovarEmpresaUseCase(empresaRepository);
  });

  it('should approve an existing empresa if the user is an admin', async () => {
    const mockUser = UserFactory.create({ type: UserType.ADMIN });

    const mockEmpresa = EmpresaFactory.create();
    await empresaRepository.create(mockEmpresa);

    await aprovarEmpresaUseCase.execute(mockEmpresa.id.toString(), mockUser);

    const updatedEmpresa = await empresaRepository.findById(
      mockEmpresa.id.toString(),
    );
    expect(updatedEmpresa?.status).toBe('APROVADA');
  });

  it('should throw a NotAllowedError if the user is not an admin', async () => {
    const mockUser = UserFactory.create({ type: UserType.EMPRESA });

    const mockEmpresa = EmpresaFactory.create();
    await empresaRepository.create(mockEmpresa);

    await expect(
      aprovarEmpresaUseCase.execute(mockEmpresa.id.toString(), mockUser),
    ).rejects.toThrow(NotAllowedError);
  });

  it('should throw a ResourceNotFound Error if the empresa not exists.', async () => {
    const mockUser = UserFactory.create({ type: UserType.ADMIN });

    await expect(
      aprovarEmpresaUseCase.execute('non-existent-id', mockUser),
    ).rejects.toThrow(ResourceNotFoundError);
  });
});
