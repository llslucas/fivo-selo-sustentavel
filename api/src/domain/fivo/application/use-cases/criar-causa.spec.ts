import { NotAllowedError } from '@core/errors/not-allowed-error';
import { CausaStatus } from '@domain/fivo/entities/causa';
import { UserRole } from '@domain/fivo/entities/user';
import { CausaFactory } from '@test/factories/causa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { CriarCausaUseCase } from './criar-causa';
import { CausaJaExisteError } from '../errors/causa-ja-existe.error';
import { NomeCausaInvalidoError } from '../errors/beneficiada-ambigua.error';

describe('CriarCausaUseCase', () => {
  let causaRepository: InMemoryCausaRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let sut: CriarCausaUseCase;

  beforeEach(() => {
    causaRepository = new InMemoryCausaRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    sut = new CriarCausaUseCase(causaRepository, registroAuditoriaRepository);
  });

  it('should create a new Causa', async () => {
    const newCausa = CausaFactory.create();
    const creator = UserFactory.create();

    const response = await sut.execute({
      nome: newCausa.nome,
      descricao: newCausa.descricao,
      user: creator,
    });

    expect(response.isRight()).toBe(true);

    if (response.isLeft()) return;

    const { causaId } = response.value;

    const causa = await causaRepository.findById(causaId);

    expect(causa).not.toBeNull();
    expect(causa?.status).toBe(CausaStatus.ATIVA);
    expect(causa?.nome).toBe(newCausa.nome);
    expect(causa?.descricao).toBe(newCausa.descricao);

    const registroAuditoria = registroAuditoriaRepository.items[0];

    expect(registroAuditoria).not.toBeNull();
    expect(registroAuditoria.tipo).toBe('CAUSA_CRIADA');
  });

  it('should return a NotAllowedError if the users is not an admin', async () => {
    const newCausa = CausaFactory.create();
    const creator = UserFactory.create({ role: UserRole.EMPRESA });

    const response = await sut.execute({
      nome: newCausa.nome,
      descricao: newCausa.descricao,
      user: creator,
    });

    expect(response.isLeft()).toBe(true);

    if (response.isRight()) return;

    expect(response.value).toBeInstanceOf(NotAllowedError);
  });

  it('should return a CausaJaExiste Error when the Causa alredy exists.', async () => {
    const newCausa = CausaFactory.create({ nome: 'Nome de causa Repetido' });
    await causaRepository.create(newCausa);

    const creator = UserFactory.create();

    const response = await sut.execute({
      nome: newCausa.nome,
      descricao: newCausa.descricao,
      user: creator,
    });

    expect(response.isLeft()).toBe(true);

    if (response.isRight()) return;

    expect(response.value).toBeInstanceOf(CausaJaExisteError);
  });

  it('should return a NomeCausaInvalidoError if the Causa name is invalid', async () => {
    const newCausa = CausaFactory.create();
    const creator = UserFactory.create();

    const response = await sut.execute({
      nome: '',
      descricao: newCausa.descricao,
      user: creator,
    });

    expect(response.isLeft()).toBe(true);

    if (response.isRight()) return;

    expect(response.value).toBeInstanceOf(NomeCausaInvalidoError);
  });
});
