import { CausaStatus } from '@domain/fivo/entities/causa';
import { CausaFactory } from '@test/factories/causa-factory';
import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { ListarCausasAtivasUseCase } from './listar-causas-ativas';

describe('ListarCausasAtivasUseCase', () => {
  let causaRepository: InMemoryCausaRepository;
  let sut: ListarCausasAtivasUseCase;

  beforeEach(() => {
    causaRepository = new InMemoryCausaRepository();
    sut = new ListarCausasAtivasUseCase(causaRepository);
  });

  it('should order causes by name ignoring accents and case', async () => {
    await causaRepository.create(CausaFactory.create({ nome: 'Zoológico' }));
    await causaRepository.create(CausaFactory.create({ nome: 'Animais' }));
    await causaRepository.create(CausaFactory.create({ nome: 'água' }));
    await causaRepository.create(CausaFactory.create({ nome: 'educação' }));

    const resultado = await sut.execute();

    expect(resultado.map((causa) => causa.nome)).toEqual([
      'água',
      'Animais',
      'educação',
      'Zoológico',
    ]);
  });

  it('should return only active causes', async () => {
    await causaRepository.create(
      CausaFactory.create({ nome: 'Animais', status: CausaStatus.ATIVA }),
    );
    await causaRepository.create(
      CausaFactory.create({ nome: 'Meio', status: CausaStatus.INATIVA }),
    );
    await causaRepository.create(
      CausaFactory.create({ nome: 'Saúde', status: CausaStatus.ATIVA }),
    );

    const resultado = await sut.execute();

    expect(resultado.map((causa) => causa.nome)).toEqual(['Animais', 'Saúde']);
  });

  it('should return an empty list when there are no active causes', async () => {
    const resultado = await sut.execute();

    expect(resultado).toEqual([]);
  });
});
