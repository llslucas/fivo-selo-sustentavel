import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { EditarCausaUseCase } from './editar-causa';
import { CausaFactory } from '@test/factories/causa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { UserRole } from '@domain/fivo/entities/user';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { CausaJaExisteError } from '../errors/causa-ja-existe.error';
import { NomeCausaInvalidoError } from '../errors/beneficiada-ambigua.error';

describe('EditarDadosCausaUseCase', () => {
  let causaRepository: InMemoryCausaRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let sut: EditarCausaUseCase;

  beforeEach(() => {
    causaRepository = new InMemoryCausaRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    sut = new EditarCausaUseCase(causaRepository, registroAuditoriaRepository);
  });

  it('should persist the edit on Causa', async () => {
    const causa = CausaFactory.create();
    await causaRepository.create(causa);
    const autor = UserFactory.create();

    const result = await sut.execute({
      causaId: causa.id.toString(),
      nome: 'Novo Nome',
      descricao: 'Novo Nome para a Causa',
      user: autor,
    });

    expect(result.isRight()).toBe(true);

    const persistedCausa = await causaRepository.findById(causa.id.toString());
    expect(persistedCausa).not.toBeNull();
    expect(persistedCausa?.nome).toBe('Novo Nome');
    expect(persistedCausa?.descricao).toBe('Novo Nome para a Causa');

    const registroAuditoria = registroAuditoriaRepository.items[0];

    expect(registroAuditoria).not.toBeNull();
    expect(registroAuditoria.entidadeId).toBe(causa.id.toString());
  });

  it('should return a NotAllowedError if the user is not an admin', async () => {
    const causa = CausaFactory.create();
    await causaRepository.create(causa);

    const autor = UserFactory.create({ role: UserRole.EMPRESA });

    const response = await sut.execute({
      causaId: causa.id.toString(),
      nome: 'Novo Nome',
      descricao: 'Nova descrição para a Causa',
      user: autor,
    });

    expect(response.isLeft()).toBe(true);

    if (response.isRight()) return;

    expect(response.value).toBeInstanceOf(NotAllowedError);
  });

  it('should return a CausaJaExiste Error when the Causa alredy exists.', async () => {
    const causa = CausaFactory.create();
    await causaRepository.create(causa);

    const causaRepetida = CausaFactory.create({ nome: 'Causa Repetida' });
    await causaRepository.create(causaRepetida);

    const creator = UserFactory.create();

    const response = await sut.execute({
      causaId: causa.id.toString(),
      nome: 'Causa Repetida',
      descricao: 'Nova descrição para a Causa',
      user: creator,
    });

    expect(response.isLeft()).toBe(true);

    if (response.isRight()) return;

    expect(response.value).toBeInstanceOf(CausaJaExisteError);
  });

  it('should persist the Causa when the Causa alredy exists but the name is not changed.', async () => {
    const causa = CausaFactory.create({ nome: 'Causa Teste' });
    await causaRepository.create(causa);

    const creator = UserFactory.create();

    const response = await sut.execute({
      causaId: causa.id.toString(),
      nome: 'Causa Teste',
      descricao: 'Nova descrição para a Causa',
      user: creator,
    });

    expect(response.isRight()).toBe(true);

    const persistedCausa = await causaRepository.findById(causa.id.toString());
    expect(persistedCausa).not.toBeNull();
    expect(persistedCausa?.nome).toBe('Causa Teste');
    expect(persistedCausa?.descricao).toBe('Nova descrição para a Causa');

    const registroAuditoria = registroAuditoriaRepository.items[0];

    expect(registroAuditoria).not.toBeNull();
    expect(registroAuditoria.entidadeId).toBe(causa.id.toString());
  });

  it('should return a NomeCausaInvalidoError if the Causa name is invalid', async () => {
    const causa = CausaFactory.create();
    await causaRepository.create(causa);

    const creator = UserFactory.create();

    const response = await sut.execute({
      causaId: causa.id.toString(),
      nome: '',
      descricao: 'Nova descrição para a Causa',
      user: creator,
    });

    expect(response.isLeft()).toBe(true);

    if (response.isRight()) return;

    expect(response.value).toBeInstanceOf(NomeCausaInvalidoError);
  });
});
