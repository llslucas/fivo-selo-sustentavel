import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Empresa, EmpresaStatus } from '@domain/fivo/empresas';
import { Slug, SlugEmUsoError } from '@domain/fivo/shared';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InMemoryEmpresaRepository } from './in-memory-empresa-repository';

// Fixa o contrato de slug que `PrismaEmpresaRepository` implementa na T20.
describe('InMemoryEmpresaRepository', () => {
  let repository: InMemoryEmpresaRepository;
  const admin = new UniqueEntityId();

  beforeEach(() => {
    repository = new InMemoryEmpresaRepository();
  });

  async function guardarAprovada(slug: string): Promise<Empresa> {
    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.APROVADA,
      slug: Slug.reconstruir(slug),
    });
    await repository.create(empresa);
    return empresa;
  }

  async function guardarPendente(): Promise<Empresa> {
    const empresa = EmpresaFactory.create();
    await repository.create(empresa);
    return empresa;
  }

  async function aprovarComSlug(
    empresa: Empresa,
    slug: string,
  ): Promise<Empresa> {
    const lida = (await repository.findById(empresa.id.toString()))!;
    expect(lida.aprovar(admin).isRight()).toBe(true);
    expect(lida.atribuirSlug(Slug.reconstruir(slug)).isRight()).toBe(true);
    return lida;
  }

  describe('listarSlugsComPrefixo', () => {
    it('devolve todos os slugs que começam com o prefixo, sem filtrar o sufixo', async () => {
      await guardarAprovada('cafe');
      await guardarAprovada('cafe-2');
      await guardarAprovada('cafeteria');
      await guardarAprovada('outra');
      await guardarPendente();

      const slugs = await repository.listarSlugsComPrefixo('cafe');

      expect([...slugs].sort()).toEqual(['cafe', 'cafe-2', 'cafeteria']);
    });
  });

  describe('findBySlug', () => {
    it('acha a empresa pelo slug', async () => {
      const empresa = await guardarAprovada('cafe-serra-verde');

      const achada = await repository.findBySlug('cafe-serra-verde');

      expect(achada?.id.toString()).toBe(empresa.id.toString());
      expect(achada?.slug?.valor).toBe('cafe-serra-verde');
    });

    it('devolve null para slug inexistente', async () => {
      await guardarAprovada('cafe-serra-verde');

      expect(await repository.findBySlug('nao-existe')).toBeNull();
    });
  });

  describe('unicidade do slug em salvarTransicao', () => {
    it('lança SlugEmUsoError quando o slug já é de outra empresa e não grava a transição', async () => {
      await guardarAprovada('cafe-serra-verde');
      const pendente = await guardarPendente();
      const aprovada = await aprovarComSlug(pendente, 'cafe-serra-verde');

      const gravacao = repository.salvarTransicao(
        aprovada,
        EmpresaStatus.PENDENTE_APROVACAO,
      );

      await expect(gravacao).rejects.toBeInstanceOf(SlugEmUsoError);
      await expect(gravacao).rejects.toThrow('Slug já está em uso');
      const guardada = (await repository.findById(pendente.id.toString()))!;
      expect(guardada.status).toBe(EmpresaStatus.PENDENTE_APROVACAO);
      expect(guardada.slug).toBeNull();
    });

    it('aceita gravar de novo a própria empresa com o slug dela', async () => {
      const pendente = await guardarPendente();
      const aprovada = await aprovarComSlug(pendente, 'cafe-serra-verde');
      await repository.salvarTransicao(
        aprovada,
        EmpresaStatus.PENDENTE_APROVACAO,
      );
      const lida = (await repository.findById(pendente.id.toString()))!;
      expect(lida.suspender(admin).isRight()).toBe(true);

      const gravou = await repository.salvarTransicao(
        lida,
        EmpresaStatus.APROVADA,
      );

      expect(gravou).toBe(true);
      const guardada = (await repository.findById(pendente.id.toString()))!;
      expect(guardada.status).toBe(EmpresaStatus.SUSPENSA);
      expect(guardada.slug?.valor).toBe('cafe-serra-verde');
    });
  });

  describe('forcarConflitoDeSlugNaProximaTransicao', () => {
    it('vale uma vez só e deixa a rival guardada com o slug', async () => {
      const pendente = await guardarPendente();
      const aprovada = await aprovarComSlug(pendente, 'cafe-serra-verde');
      repository.forcarConflitoDeSlugNaProximaTransicao();

      await expect(
        repository.salvarTransicao(aprovada, EmpresaStatus.PENDENTE_APROVACAO),
      ).rejects.toBeInstanceOf(SlugEmUsoError);

      expect(
        await repository.listarSlugsComPrefixo('cafe-serra-verde'),
      ).toEqual(['cafe-serra-verde']);
      const rival = await repository.findBySlug('cafe-serra-verde');
      expect(rival?.id.toString()).not.toBe(pendente.id.toString());

      const segunda = await aprovarComSlug(pendente, 'cafe-serra-verde-2');
      const gravou = await repository.salvarTransicao(
        segunda,
        EmpresaStatus.PENDENTE_APROVACAO,
      );

      expect(gravou).toBe(true);
      const guardada = (await repository.findById(pendente.id.toString()))!;
      expect(guardada.slug?.valor).toBe('cafe-serra-verde-2');
    });
  });
});
