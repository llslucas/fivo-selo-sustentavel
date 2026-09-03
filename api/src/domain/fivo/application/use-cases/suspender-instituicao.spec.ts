import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UserType } from '@domain/fivo/entities/user';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';
import { SuspenderInstituicaoUseCase } from './suspender-instituicao';

describe('SuspenderInstituicaoUseCase', () => {
  let suspenderInstituicaoUseCase: SuspenderInstituicaoUseCase;
  let instituicaoRepository: InstituicaoRepository;

  beforeEach(() => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    suspenderInstituicaoUseCase = new SuspenderInstituicaoUseCase(
      instituicaoRepository,
    );
  });

  it('should suspend an existing instituicao if the user is an admin', async () => {
    const mockUser = UserFactory.create({ type: UserType.ADMIN });

    const mockInstituicao = InstituicaoFactory.create();
    await instituicaoRepository.create(mockInstituicao);

    await suspenderInstituicaoUseCase.execute(
      mockInstituicao.id.toString(),
      mockUser,
    );

    const updatedInstituicao = await instituicaoRepository.findById(
      mockInstituicao.id.toString(),
    );

    expect(updatedInstituicao?.status).toBe(InstituicaoStatus.SUSPENSA);
    expect(updatedInstituicao?.decidido_por).toEqual(mockUser);
  });

  it('should throw a NotAllowedError if the user is not an admin', async () => {
    const mockUser = UserFactory.create({ type: UserType.INSTITUICAO });

    const mockInstituicao = InstituicaoFactory.create();
    await instituicaoRepository.create(mockInstituicao);

    await expect(
      suspenderInstituicaoUseCase.execute(
        mockInstituicao.id.toString(),
        mockUser,
      ),
    ).rejects.toThrow(NotAllowedError);
  });

  it('should throw a ResourceNotFound Error if the instituicao not exists.', async () => {
    const mockUser = UserFactory.create({ type: UserType.ADMIN });

    await expect(
      suspenderInstituicaoUseCase.execute('non-existent-id', mockUser),
    ).rejects.toThrow(ResourceNotFoundError);
  });
});
