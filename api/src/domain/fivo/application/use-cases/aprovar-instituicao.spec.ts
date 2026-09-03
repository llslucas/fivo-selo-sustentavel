import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UserRole } from '@domain/fivo/entities/user';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { AprovarInstituicaoUseCase } from './aprovar-instituicao';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';

describe('AprovarInstituicaoUseCase', () => {
  let aprovarInstituicaoUseCase: AprovarInstituicaoUseCase;
  let instituicaoRepository: InstituicaoRepository;

  beforeEach(() => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    aprovarInstituicaoUseCase = new AprovarInstituicaoUseCase(
      instituicaoRepository,
    );
  });

  it('should approve an existing instituicao if the user is an admin', async () => {
    const mockUser = UserFactory.create({ role: UserRole.ADMIN });

    const mockInstituicao = InstituicaoFactory.create();
    await instituicaoRepository.create(mockInstituicao);

    await aprovarInstituicaoUseCase.execute(
      mockInstituicao.id.toString(),
      mockUser,
    );

    const updatedInstituicao = await instituicaoRepository.findById(
      mockInstituicao.id.toString(),
    );

    expect(updatedInstituicao?.status).toBe(InstituicaoStatus.APROVADA);
    expect(updatedInstituicao?.decidido_por).toEqual(mockUser);
  });

  it('should throw a NotAllowedError if the user is not an admin', async () => {
    const mockUser = UserFactory.create({ role: UserRole.INSTITUICAO });

    const mockInstituicao = InstituicaoFactory.create();
    await instituicaoRepository.create(mockInstituicao);

    await expect(
      aprovarInstituicaoUseCase.execute(
        mockInstituicao.id.toString(),
        mockUser,
      ),
    ).rejects.toThrow(NotAllowedError);
  });

  it('should throw a ResourceNotFound Error if the instituicao not exists.', async () => {
    const mockUser = UserFactory.create({ role: UserRole.ADMIN });

    await expect(
      aprovarInstituicaoUseCase.execute('non-existent-id', mockUser),
    ).rejects.toThrow(ResourceNotFoundError);
  });
});
