import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UserRole } from '@domain/fivo/entities/user';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { RejeitarInstituicaoUseCase } from './rejeitar-instituicao';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';

describe('RejeitarInstituicaoUseCase', () => {
  let rejeitarInstituicaoUseCase: RejeitarInstituicaoUseCase;
  let instituicaoRepository: InstituicaoRepository;

  beforeEach(() => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    rejeitarInstituicaoUseCase = new RejeitarInstituicaoUseCase(
      instituicaoRepository,
    );
  });

  it('should reject an existing instituicao if the user is an admin', async () => {
    const mockUser = UserFactory.create({ role: UserRole.ADMIN });

    const mockInstituicao = InstituicaoFactory.create();
    await instituicaoRepository.create(mockInstituicao);

    await rejeitarInstituicaoUseCase.execute(
      mockInstituicao.id.toString(),
      mockUser,
    );

    const updatedInstituicao = await instituicaoRepository.findById(
      mockInstituicao.id.toString(),
    );

    expect(updatedInstituicao?.status).toBe(InstituicaoStatus.REJEITADA);
    expect(updatedInstituicao?.decidido_por).toEqual(mockUser);
  });

  it('should throw a NotAllowedError if the user is not an admin', async () => {
    const mockUser = UserFactory.create({ role: UserRole.INSTITUICAO });

    const mockInstituicao = InstituicaoFactory.create();
    await instituicaoRepository.create(mockInstituicao);

    await expect(
      rejeitarInstituicaoUseCase.execute(
        mockInstituicao.id.toString(),
        mockUser,
      ),
    ).rejects.toThrow(NotAllowedError);
  });

  it('should throw a ResourceNotFound Error if the instituicao not exists.', async () => {
    const mockUser = UserFactory.create({ role: UserRole.ADMIN });

    await expect(
      rejeitarInstituicaoUseCase.execute('non-existent-id', mockUser),
    ).rejects.toThrow(ResourceNotFoundError);
  });
});
