import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Empresa, EmpresaStatus } from '@domain/fivo/empresas';
import { Slug } from '@domain/fivo/shared';
import { FakeRenderizadorDeSelo } from '@test/doubles/fake-renderizador-de-selo';
import { InMemoryCampanhaRepository } from '@test/doubles/in-memory-campanha-repository';
import { InMemoryEmpresaRepository } from '@test/doubles/in-memory-empresa-repository';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { Campanha, CampanhaStatus } from '../entities/campanha';
import { CampanhaNaoAprovadaError } from '../errors/campanha-nao-aprovada.error';
import { GerarSeloUseCase } from './gerar-selo';

describe('GerarSeloUseCase', () => {
  const naoEncontrada = new ResourceNotFoundError('Campanha não encontrada');

  let campanhaRepository: InMemoryCampanhaRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let renderizador: FakeRenderizadorDeSelo;
  let sut: GerarSeloUseCase;
  let empresa: Empresa;

  beforeEach(async () => {
    campanhaRepository = new InMemoryCampanhaRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    renderizador = new FakeRenderizadorDeSelo();
    sut = new GerarSeloUseCase(
      campanhaRepository,
      empresaRepository,
      renderizador,
    );

    empresa = EmpresaFactory.create({
      slug: Slug.reconstruir('cafe-serra-verde'),
    });
    await empresaRepository.create(empresa);
  });

  async function campanhaAprovada(
    empresaId = empresa.id,
    slug: Slug | null = Slug.reconstruir('agua-limpa'),
  ): Promise<Campanha> {
    const campanha = CampanhaFactory.aprovada({ empresaId, slug });
    await campanhaRepository.create(campanha);
    return campanha;
  }

  function gerar(campanhaId: string) {
    return sut.execute({ empresaId: empresa.id.toString(), campanhaId });
  }

  it('devolve o SVG do renderizador com os slugs da empresa e da campanha', async () => {
    const campanha = await campanhaAprovada();

    const resultado = await gerar(campanha.id.toString());

    expect(resultado.isRight()).toBe(true);
    expect(resultado.value).toEqual({
      svg: '<svg data-empresa="cafe-serra-verde" data-campanha="agua-limpa"/>',
      slugCampanha: 'agua-limpa',
    });
    expect(renderizador.chamadas).toEqual([
      { slugEmpresa: 'cafe-serra-verde', slugCampanha: 'agua-limpa' },
    ]);
  });

  it('devolve o mesmo SVG em duas chamadas', async () => {
    const campanha = await campanhaAprovada();

    const primeira = await gerar(campanha.id.toString());
    const segunda = await gerar(campanha.id.toString());

    expect(primeira.isRight()).toBe(true);
    expect(segunda.value).toEqual(primeira.value);
  });

  it('gera o selo de empresa suspensa, que a feature não bloqueia', async () => {
    const suspensa = EmpresaFactory.create({
      status: EmpresaStatus.SUSPENSA,
      slug: Slug.reconstruir('suspensa'),
    });
    await empresaRepository.create(suspensa);
    const campanha = await campanhaAprovada(suspensa.id);

    const resultado = await sut.execute({
      empresaId: suspensa.id.toString(),
      campanhaId: campanha.id.toString(),
    });

    expect(resultado.isRight()).toBe(true);
    expect(renderizador.chamadas).toEqual([
      { slugEmpresa: 'suspensa', slugCampanha: 'agua-limpa' },
    ]);
  });

  it.each([
    CampanhaStatus.RASCUNHO,
    CampanhaStatus.EM_ANALISE,
    CampanhaStatus.REJEITADA,
  ])('recusa campanha em %s sem chamar o renderizador', async (status) => {
    const campanha = CampanhaFactory.completa({
      empresaId: empresa.id,
      status,
      slug: Slug.reconstruir('agua-limpa'),
    });
    await campanhaRepository.create(campanha);

    const resultado = await gerar(campanha.id.toString());

    expect(resultado.isLeft()).toBe(true);
    expect(resultado.value).toBeInstanceOf(CampanhaNaoAprovadaError);
    expect((resultado.value as CampanhaNaoAprovadaError).status).toBe(409);
    expect((resultado.value as CampanhaNaoAprovadaError).message).toBe(
      'Campanha não está aprovada',
    );
    expect(renderizador.chamadas).toEqual([]);
  });

  it('responde "Campanha não encontrada" para campanha inexistente', async () => {
    const resultado = await gerar(new UniqueEntityId().toString());

    expect(resultado.isLeft()).toBe(true);
    expect(resultado.value).toBeInstanceOf(ResourceNotFoundError);
    expect(resultado.value).toEqual(naoEncontrada);
    expect(renderizador.chamadas).toEqual([]);
  });

  it('responde "Campanha não encontrada" para campanha de outra empresa', async () => {
    const campanha = await campanhaAprovada(new UniqueEntityId());

    const resultado = await gerar(campanha.id.toString());

    expect(resultado.isLeft()).toBe(true);
    expect(resultado.value).toBeInstanceOf(ResourceNotFoundError);
    expect(resultado.value).toEqual(naoEncontrada);
    expect(renderizador.chamadas).toEqual([]);
  });

  it('recusa campanha aprovada sem slug sem chamar o renderizador', async () => {
    const campanha = await campanhaAprovada(empresa.id, null);

    const resultado = await gerar(campanha.id.toString());

    expect(resultado.value).toBeInstanceOf(CampanhaNaoAprovadaError);
    expect(renderizador.chamadas).toEqual([]);
  });

  it('recusa empresa sem slug sem chamar o renderizador', async () => {
    const semSlug = EmpresaFactory.create();
    await empresaRepository.create(semSlug);
    const campanha = await campanhaAprovada(semSlug.id);

    const resultado = await sut.execute({
      empresaId: semSlug.id.toString(),
      campanhaId: campanha.id.toString(),
    });

    expect(resultado.value).toBeInstanceOf(CampanhaNaoAprovadaError);
    expect(renderizador.chamadas).toEqual([]);
  });
});
