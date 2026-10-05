import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { InativarCausaUseCase } from './inativar-causa';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { CausaFactory } from '@test/factories/causa-factory';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';
import { CausaStatus } from '@domain/fivo/entities/causa';
import { UserFactory } from '@test/factories/user-factory';
import { UserRole } from '@domain/fivo/entities/user';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { CausaComInstituicoesAprovadasError } from '../errors/causa-com-instituicoes-aprovadas.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';

describe('InativarCausaUseCase', () => {
  let causaRepository: InMemoryCausaRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let sut: InativarCausaUseCase;

  beforeEach(() => {
    causaRepository = new InMemoryCausaRepository();
    instituicaoRepository = new InMemoryInstituicaoRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    sut = new InativarCausaUseCase(
      causaRepository,
      instituicaoRepository,
      registroAuditoriaRepository,
    );
  });

  it('should return NotAllowedError if the user is not an admin', async () => {
    const causa = CausaFactory.create();
    await causaRepository.create(causa);

    const autor = UserFactory.create({ role: UserRole.EMPRESA });

    const response = await sut.execute({
      causaId: causa.id.toString(),
      user: autor,
    });

    expect(response.isLeft()).toBe(true);

    if (response.isRight()) return;

    expect(response.value).toBeInstanceOf(NotAllowedError);
  });

  it('should return ResourceNotFoundError if the causa does not exist', async () => {
    const autor = UserFactory.create();

    const response = await sut.execute({
      causaId: 'id-que-nao-existe',
      user: autor,
    });

    expect(response.isLeft()).toBe(true);

    if (response.isRight()) return;

    expect(response.value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should return CausaComInstituicoesAprovadasError if the causa has approved institutions', async () => {
    const causa = CausaFactory.create();
    await causaRepository.create(causa);

    const instituicao = InstituicaoFactory.create({
      causaId: causa.id,
      nomeFantasia: 'Instituição Esperança',
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);

    const response = await sut.execute({
      causaId: causa.id.toString(),
      user: UserFactory.create(),
    });

    expect(response.isLeft()).toBe(true);

    if (response.isRight()) return;

    expect(response.value).toBeInstanceOf(CausaComInstituicoesAprovadasError);
    expect(response.value.message).toContain('Instituição Esperança');

    const causaPersistida = await causaRepository.findById(causa.id.toString());
    expect(causaPersistida?.status).toBe(CausaStatus.ATIVA);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });

  it('should list all approved institutions in the error', async () => {
    const causa = CausaFactory.create();
    await causaRepository.create(causa);

    const instituicao1 = InstituicaoFactory.create({
      causaId: causa.id,
      nomeFantasia: 'Instituição Esperança',
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao1);

    const instituicao2 = InstituicaoFactory.create({
      causaId: causa.id,
      nomeFantasia: 'Instituição Alegria',
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao2);

    const response = await sut.execute({
      causaId: causa.id.toString(),
      user: UserFactory.create(),
    });

    expect(response.isLeft()).toBe(true);

    if (response.isRight()) return;

    expect(response.value).toBeInstanceOf(CausaComInstituicoesAprovadasError);
    expect(response.value.message).toContain('Instituição Esperança');
    expect(response.value.message).toContain('Instituição Alegria');
  });

  it.each([
    InstituicaoStatus.PENDENTE_APROVACAO,
    InstituicaoStatus.REJEITADA,
    InstituicaoStatus.SUSPENSA,
    InstituicaoStatus.INATIVA,
  ])(
    'should inactivate the causa when the institution is %s',
    async (estado) => {
      const causa = CausaFactory.create();
      await causaRepository.create(causa);

      const instituicao = InstituicaoFactory.create({
        causaId: causa.id,
        status: estado,
      });
      await instituicaoRepository.create(instituicao);

      const response = await sut.execute({
        causaId: causa.id.toString(),
        user: UserFactory.create(),
      });

      expect(response.isRight()).toBe(true);
    },
  );

  it('should inactivate the causa when the approved institution belongs to another causa', async () => {
    const causa = CausaFactory.create();
    await causaRepository.create(causa);

    const instituicao = InstituicaoFactory.create({
      nomeFantasia: 'Instituição Esperança',
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);

    const response = await sut.execute({
      causaId: causa.id.toString(),
      user: UserFactory.create(),
    });

    expect(response.isRight()).toBe(true);
  });

  it('should inactivate the causa and record the audit', async () => {
    const causa = CausaFactory.create();
    await causaRepository.create(causa);
    const autor = UserFactory.create();

    const result = await sut.execute({
      causaId: causa.id.toString(),
      user: autor,
    });

    expect(result.isRight()).toBe(true);

    const persistedCausa = await causaRepository.findById(causa.id.toString());

    expect(persistedCausa).not.toBeNull();
    expect(causaRepository.items).toHaveLength(1);
    expect(persistedCausa?.status).toBe(CausaStatus.INATIVA);

    const registroAuditoria = registroAuditoriaRepository.items[0];

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(registroAuditoria.tipo).toBe('CAUSA_INATIVADA');
    expect(registroAuditoria.entidadeId).toBe(causa.id.toString());
  });

  it('should return TransicaoInvalidaError if the causa is already inactive', async () => {
    const autor = UserFactory.create();
    const causa = CausaFactory.create({ status: CausaStatus.INATIVA });
    await causaRepository.create(causa);

    const response = await sut.execute({
      causaId: causa.id.toString(),
      user: autor,
    });

    expect(response.isLeft()).toBe(true);

    if (response.isRight()) return;

    expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
  });
});
