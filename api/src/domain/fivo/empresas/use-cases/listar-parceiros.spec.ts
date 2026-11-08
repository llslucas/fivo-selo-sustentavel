import { EmpresaStatus } from '../entities/empresa';
import { Slug } from '@domain/fivo/shared';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InMemoryEmpresaRepository } from '@test/doubles/in-memory-empresa-repository';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { ListarParceirosUseCase } from './listar-parceiros';

describe('ListarParceirosUseCase', () => {
  let empresaRepository: InMemoryEmpresaRepository;
  let sut: ListarParceirosUseCase;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    sut = new ListarParceirosUseCase(empresaRepository);
  });

  it('should list only APROVADA empresas, leaving every other status out', async () => {
    await empresaRepository.create(
      EmpresaFactory.create({
        nomeFantasia: 'Aprovada',
        status: EmpresaStatus.APROVADA,
        slug: Slug.reconstruir('aprovada'),
      }),
    );
    await empresaRepository.create(
      EmpresaFactory.create({
        nomeFantasia: 'Pendente',
        status: EmpresaStatus.PENDENTE_APROVACAO,
        slug: Slug.reconstruir('pendente'),
      }),
    );
    await empresaRepository.create(
      EmpresaFactory.create({
        nomeFantasia: 'Rejeitada',
        status: EmpresaStatus.REJEITADA,
        slug: Slug.reconstruir('rejeitada'),
      }),
    );
    await empresaRepository.create(
      EmpresaFactory.create({
        nomeFantasia: 'Suspensa',
        status: EmpresaStatus.SUSPENSA,
        slug: Slug.reconstruir('suspensa'),
      }),
    );

    const parceiros = await sut.execute();

    expect(parceiros.map((item) => item.slug)).toEqual(['aprovada']);
  });

  it('should order by nomeFantasia ignoring case and accents', async () => {
    await empresaRepository.create(
      EmpresaFactory.create({
        nomeFantasia: 'Zebu',
        status: EmpresaStatus.APROVADA,
        slug: Slug.reconstruir('zebu'),
      }),
    );
    await empresaRepository.create(
      EmpresaFactory.create({
        nomeFantasia: 'água',
        status: EmpresaStatus.APROVADA,
        slug: Slug.reconstruir('agua'),
      }),
    );
    await empresaRepository.create(
      EmpresaFactory.create({
        nomeFantasia: 'Abelha',
        status: EmpresaStatus.APROVADA,
        slug: Slug.reconstruir('abelha'),
      }),
    );

    const parceiros = await sut.execute();

    expect(parceiros.map((item) => item.nomeFantasia)).toEqual([
      'Abelha',
      'água',
      'Zebu',
    ]);
  });

  it('should leave out an APROVADA empresa without slug', async () => {
    await empresaRepository.create(
      EmpresaFactory.create({
        nomeFantasia: 'Com Slug',
        status: EmpresaStatus.APROVADA,
        slug: Slug.reconstruir('com-slug'),
      }),
    );
    await empresaRepository.create(
      EmpresaFactory.create({
        nomeFantasia: 'Sem Slug',
        status: EmpresaStatus.APROVADA,
        slug: null,
      }),
    );

    const parceiros = await sut.execute();

    expect(parceiros.map((item) => item.slug)).toEqual(['com-slug']);
  });

  it('should project exactly slug, nomeFantasia, cidade, uf and temLogo', async () => {
    await empresaRepository.create(
      EmpresaFactory.create({
        nomeFantasia: 'Com Logo',
        cidade: 'Campinas',
        uf: 'SP',
        status: EmpresaStatus.APROVADA,
        slug: Slug.reconstruir('com-logo'),
        logoArquivoId: new UniqueEntityId(),
      }),
    );
    await empresaRepository.create(
      EmpresaFactory.create({
        nomeFantasia: 'Sem Logo',
        cidade: 'Santos',
        uf: 'SP',
        status: EmpresaStatus.APROVADA,
        slug: Slug.reconstruir('sem-logo'),
        logoArquivoId: null,
      }),
    );

    const parceiros = await sut.execute();

    expect(parceiros).toEqual([
      {
        slug: 'com-logo',
        nomeFantasia: 'Com Logo',
        cidade: 'Campinas',
        uf: 'SP',
        temLogo: true,
      },
      {
        slug: 'sem-logo',
        nomeFantasia: 'Sem Logo',
        cidade: 'Santos',
        uf: 'SP',
        temLogo: false,
      },
    ]);
  });

  it('should return an empty list when there is no empresa', async () => {
    const parceiros = await sut.execute();

    expect(parceiros).toEqual([]);
  });
});
