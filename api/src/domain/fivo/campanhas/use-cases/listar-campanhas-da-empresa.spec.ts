import { Either } from '@core/either';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Empresa } from '@domain/fivo/empresas';
import { Slug } from '@domain/fivo/shared';
import { InMemoryCampanhaRepository } from '@test/doubles/in-memory-campanha-repository';
import { InMemoryEmpresaRepository } from '@test/doubles/in-memory-empresa-repository';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { CampanhaStatus } from '../entities/campanha';
import { NomeCampanha } from '../entities/nome-campanha';
import { RegraDoacao, TipoRegraDoacao } from '../entities/regra-doacao';
import { ListarCampanhasDaEmpresaUseCase } from './listar-campanhas-da-empresa';

function valor<T>(resultado: Either<Error, T>): T {
  if (resultado.isLeft()) {
    throw resultado.value;
  }

  return resultado.value;
}

describe('ListarCampanhasDaEmpresaUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let sut: ListarCampanhasDaEmpresaUseCase;
  let empresa: Empresa;

  beforeEach(async () => {
    campanhaRepository = new InMemoryCampanhaRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    sut = new ListarCampanhasDaEmpresaUseCase(
      campanhaRepository,
      empresaRepository,
    );

    empresa = EmpresaFactory.create({
      slug: Slug.reconstruir('cafe-serra-verde'),
    });
    await empresaRepository.create(empresa);
  });

  function listar(empresaId = empresa.id.toString()) {
    return sut.execute({ empresaId });
  }

  async function listarCampanhas() {
    const resultado = await listar();

    if (resultado.isLeft()) {
      throw resultado.value;
    }

    return resultado.value.campanhas;
  }

  it('devolve o slug da empresa e cada campanha com id, nome, status, regra e slug', async () => {
    const campanha = CampanhaFactory.aprovada({
      empresaId: empresa.id,
      nome: valor(NomeCampanha.criar('Água Limpa')),
      slug: Slug.reconstruir('agua-limpa'),
    });
    await campanhaRepository.create(campanha);

    const resultado = await listar();

    expect(resultado.isRight()).toBe(true);
    expect(resultado.value).toEqual({
      slugEmpresa: 'cafe-serra-verde',
      campanhas: [
        {
          id: campanha.id.toString(),
          nome: 'Água Limpa',
          status: CampanhaStatus.APROVADA,
          regraDoacao: { tipo: TipoRegraDoacao.POR_UNIDADE, valor: '1.00' },
          slug: 'agua-limpa',
        },
      ],
    });
  });

  it('devolve só as campanhas da empresa', async () => {
    const minha = CampanhaFactory.create({ empresaId: empresa.id });
    const deOutra = CampanhaFactory.create({
      empresaId: new UniqueEntityId(),
    });
    await campanhaRepository.create(minha);
    await campanhaRepository.create(deOutra);

    const campanhas = await listarCampanhas();

    expect(campanhas.map((item) => item.id)).toEqual([minha.id.toString()]);
  });

  it('ordena da campanha criada mais recentemente para a mais antiga', async () => {
    const antiga = CampanhaFactory.create({
      empresaId: empresa.id,
      createdAt: new Date('2026-10-01T10:00:00Z'),
    });
    const recente = CampanhaFactory.create({
      empresaId: empresa.id,
      createdAt: new Date('2026-10-20T10:00:00Z'),
    });
    const meio = CampanhaFactory.create({
      empresaId: empresa.id,
      createdAt: new Date('2026-10-10T10:00:00Z'),
    });
    await campanhaRepository.create(antiga);
    await campanhaRepository.create(recente);
    await campanhaRepository.create(meio);

    const campanhas = await listarCampanhas();

    expect(campanhas.map((item) => item.id)).toEqual([
      recente.id.toString(),
      meio.id.toString(),
      antiga.id.toString(),
    ]);
  });

  it('devolve regraDoacao nula quando a regra não foi definida', async () => {
    await campanhaRepository.create(
      CampanhaFactory.create({ empresaId: empresa.id }),
    );

    const [item] = await listarCampanhas();

    expect(item.regraDoacao).toBeNull();
  });

  it('devolve a regra POR_UNIDADE com valor e sem percentual', async () => {
    await campanhaRepository.create(
      CampanhaFactory.create({
        empresaId: empresa.id,
        regraDoacao: valor(
          RegraDoacao.criar({
            tipo: TipoRegraDoacao.POR_UNIDADE,
            valor: '1.50',
          }),
        ),
      }),
    );

    const [item] = await listarCampanhas();

    expect(item.regraDoacao).toEqual({
      tipo: TipoRegraDoacao.POR_UNIDADE,
      valor: '1.50',
    });
  });

  it('devolve a regra PERCENTUAL com percentual e sem valor', async () => {
    await campanhaRepository.create(
      CampanhaFactory.create({
        empresaId: empresa.id,
        regraDoacao: valor(
          RegraDoacao.criar({
            tipo: TipoRegraDoacao.PERCENTUAL,
            percentual: '2.5',
          }),
        ),
      }),
    );

    const [item] = await listarCampanhas();

    expect(item.regraDoacao).toEqual({
      tipo: TipoRegraDoacao.PERCENTUAL,
      percentual: '2.50',
    });
  });

  it('devolve slug nulo para campanha ainda sem slug', async () => {
    await campanhaRepository.create(
      CampanhaFactory.create({ empresaId: empresa.id }),
    );

    const [item] = await listarCampanhas();

    expect(item.slug).toBeNull();
  });

  it('devolve slugEmpresa nulo para empresa ainda sem slug', async () => {
    const semSlug = EmpresaFactory.create();
    await empresaRepository.create(semSlug);

    const resultado = await listar(semSlug.id.toString());

    expect(resultado.isRight()).toBe(true);
    expect(resultado.value).toEqual({ slugEmpresa: null, campanhas: [] });
  });

  it('devolve lista vazia para empresa sem campanhas', async () => {
    const resultado = await listar();

    expect(resultado.isRight()).toBe(true);
    expect(resultado.value).toEqual({
      slugEmpresa: 'cafe-serra-verde',
      campanhas: [],
    });
  });

  it('responde "Empresa não encontrada" para empresa inexistente', async () => {
    const resultado = await listar(new UniqueEntityId().toString());

    expect(resultado.isLeft()).toBe(true);
    expect(resultado.value).toBeInstanceOf(ResourceNotFoundError);
    expect(resultado.value).toEqual(
      new ResourceNotFoundError('Empresa não encontrada'),
    );
    expect((resultado.value as ResourceNotFoundError).message).toBe(
      'Resource Empresa não encontrada not found',
    );
  });
});
