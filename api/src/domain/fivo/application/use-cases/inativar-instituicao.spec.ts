import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';
import { UserRole } from '@domain/fivo/entities/user';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { InativarInstituicaoUseCase } from './inativar-instituicao';

describe('InativarInstituicaoUseCase', () => {
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let sut: InativarInstituicaoUseCase;

  beforeEach(() => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    sut = new InativarInstituicaoUseCase(
      instituicaoRepository,
      registroAuditoriaRepository,
    );
  });

  it('should inactivate an APROVADA instituicao: set INATIVA and write one audit row', async () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(instituicao.id.toString(), admin);

    expect(response.isRight()).toBe(true);

    const updated = await instituicaoRepository.findById(
      instituicao.id.toString(),
    );
    expect(updated?.status).toBe(InstituicaoStatus.INATIVA);
    expect(updated?.decididoPor?.equals(admin.id)).toBe(true);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(registroAuditoriaRepository.items[0].dados).toEqual(
      expect.objectContaining({
        estadoAnterior: InstituicaoStatus.APROVADA,
        estadoNovo: InstituicaoStatus.INATIVA,
      }),
    );
  });

  it('should keep the record after inactivation (no deletion)', async () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(instituicao.id.toString(), admin);

    expect(response.isRight()).toBe(true);
    expect(instituicaoRepository.items).toHaveLength(1);

    const persisted = await instituicaoRepository.findById(
      instituicao.id.toString(),
    );
    expect(persisted).not.toBeNull();
    expect(persisted?.status).toBe(InstituicaoStatus.INATIVA);
  });

  it.each([
    InstituicaoStatus.PENDENTE_APROVACAO,
    InstituicaoStatus.REJEITADA,
    InstituicaoStatus.SUSPENSA,
    InstituicaoStatus.INATIVA,
  ])(
    'should reject with TransicaoInvalidaError (409) when the instituicao is %s',
    async (status) => {
      const instituicao = InstituicaoFactory.create({ status });
      await instituicaoRepository.create(instituicao);
      const admin = UserFactory.create({ role: UserRole.ADMIN });

      const response = await sut.execute(instituicao.id.toString(), admin);

      expect(response.isLeft()).toBe(true);
      if (response.isLeft()) {
        expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
      }

      const persisted = await instituicaoRepository.findById(
        instituicao.id.toString(),
      );
      expect(persisted?.status).toBe(status);
      expect(registroAuditoriaRepository.items).toHaveLength(0);
    },
  );

  it('should reject with NotAllowedError (403) when the user is not an admin', async () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);
    const naoAdmin = UserFactory.create({ role: UserRole.EMPRESA });

    const response = await sut.execute(instituicao.id.toString(), naoAdmin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(NotAllowedError);
    }
  });

  it('should reject with ResourceNotFoundError (404) when the instituicao does not exist', async () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute('non-existent-id', admin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
    }
  });

  it('should reject with TransicaoInvalidaError and leave no audit when salvarTransicao is not applied', async () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    jest
      .spyOn(instituicaoRepository, 'salvarTransicao')
      .mockResolvedValueOnce(false);

    const response = await sut.execute(instituicao.id.toString(), admin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    }
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });
});
