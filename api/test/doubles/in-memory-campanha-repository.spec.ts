import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Campanha } from '@domain/fivo/campanhas/entities/campanha';
import { Slug, SlugEmUsoError } from '@domain/fivo/shared';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { InMemoryCampanhaRepository } from './in-memory-campanha-repository';

describe('InMemoryCampanhaRepository', () => {
  let repository: InMemoryCampanhaRepository;
  let empresaId: UniqueEntityId;
  let outraEmpresaId: UniqueEntityId;

  beforeEach(() => {
    repository = new InMemoryCampanhaRepository();
    empresaId = new UniqueEntityId();
    outraEmpresaId = new UniqueEntityId();
  });

  async function guardarAprovada(
    empresa: UniqueEntityId,
    slug?: string,
  ): Promise<Campanha> {
    const campanha = CampanhaFactory.aprovada({
      empresaId: empresa,
      slug: slug ? Slug.reconstruir(slug) : null,
    });
    await repository.create(campanha);
    return campanha;
  }

  async function aprovarComSlug(
    campanha: Campanha,
    slug: string,
  ): Promise<Campanha> {
    const lida = (await repository.findById(campanha.id.toString()))!;
    expect(lida.atribuirSlug(Slug.reconstruir(slug)).isRight()).toBe(true);
    return lida;
  }

  describe('listarPorEmpresa', () => {
    it('devolve só as campanhas da empresa pedida, da mais recente para a mais antiga', async () => {
      const antiga = CampanhaFactory.create({
        empresaId,
        createdAt: new Date('2026-10-01T12:00:00Z'),
      });
      const recente = CampanhaFactory.create({
        empresaId,
        createdAt: new Date('2026-10-03T12:00:00Z'),
      });
      const deOutraEmpresa = CampanhaFactory.create({
        empresaId: outraEmpresaId,
        createdAt: new Date('2026-10-02T12:00:00Z'),
      });
      await repository.create(antiga);
      await repository.create(deOutraEmpresa);
      await repository.create(recente);

      const campanhas = await repository.listarPorEmpresa(empresaId.toString());

      expect(campanhas.map((item) => item.id.toString())).toEqual([
        recente.id.toString(),
        antiga.id.toString(),
      ]);
    });

    it('devolve lista vazia para empresa sem campanhas', async () => {
      await guardarAprovada(outraEmpresaId, 'agua-limpa');

      const campanhas = await repository.listarPorEmpresa(empresaId.toString());

      expect(campanhas).toEqual([]);
    });
  });

  describe('salvar com slug', () => {
    it('grava o slug e o devolve no findById e no listarPorEmpresa', async () => {
      const campanha = await guardarAprovada(empresaId);
      const comSlug = await aprovarComSlug(campanha, 'agua-limpa');

      const gravou = await repository.salvar(comSlug, 0);

      expect(gravou).toBe(true);
      const lida = await repository.findById(campanha.id.toString());
      expect(lida?.slug?.valor).toBe('agua-limpa');
      const lista = await repository.listarPorEmpresa(empresaId.toString());
      expect(lista[0].slug?.valor).toBe('agua-limpa');
    });

    it('lança SlugEmUsoError quando outra campanha da mesma empresa já tem o slug, sem gravar nada', async () => {
      await guardarAprovada(empresaId, 'agua-limpa');
      const campanha = await guardarAprovada(empresaId);
      const comSlug = await aprovarComSlug(campanha, 'agua-limpa');

      const salvar = repository.salvar(comSlug, 0);

      await expect(salvar).rejects.toBeInstanceOf(SlugEmUsoError);
      await expect(salvar).rejects.toThrow('Slug já está em uso');
      const lida = await repository.findById(campanha.id.toString());
      expect(lida?.slug).toBeNull();
      expect(lida?.versao).toBe(0);
    });

    it('permite o mesmo slug em campanhas de empresas diferentes', async () => {
      await guardarAprovada(outraEmpresaId, 'agua-limpa');
      const campanha = await guardarAprovada(empresaId);
      const comSlug = await aprovarComSlug(campanha, 'agua-limpa');

      const gravou = await repository.salvar(comSlug, 0);

      expect(gravou).toBe(true);
      const lida = await repository.findById(campanha.id.toString());
      expect(lida?.slug?.valor).toBe('agua-limpa');
    });

    it('não acusa conflito quando a própria campanha é salva de novo com o slug dela', async () => {
      const campanha = await guardarAprovada(empresaId, 'agua-limpa');
      const lida = (await repository.findById(campanha.id.toString()))!;

      const gravou = await repository.salvar(lida, 0);

      expect(gravou).toBe(true);
      const relida = await repository.findById(campanha.id.toString());
      expect(relida?.slug?.valor).toBe('agua-limpa');
      expect(relida?.versao).toBe(1);
    });

    it('devolve false pela versão antes de checar o slug', async () => {
      await guardarAprovada(empresaId, 'agua-limpa');
      const campanha = await guardarAprovada(empresaId);
      const comSlug = await aprovarComSlug(campanha, 'agua-limpa');

      const gravou = await repository.salvar(comSlug, 5);

      expect(gravou).toBe(false);
    });
  });

  describe('forcarConflitoDeSlugNoProximoSalvar', () => {
    it('lança SlugEmUsoError uma vez, guarda a rival e deixa a nova tentativa gravar com outro slug', async () => {
      const campanha = await guardarAprovada(empresaId);
      repository.forcarConflitoDeSlugNoProximoSalvar();

      const primeira = await aprovarComSlug(campanha, 'agua-limpa');
      const salvar = repository.salvar(primeira, 0);

      await expect(salvar).rejects.toBeInstanceOf(SlugEmUsoError);
      await expect(salvar).rejects.toThrow('Slug já está em uso');
      const naoGravada = await repository.findById(campanha.id.toString());
      expect(naoGravada?.slug).toBeNull();
      expect(naoGravada?.versao).toBe(0);

      const ocupados = (
        await repository.listarPorEmpresa(empresaId.toString())
      ).map((item) => item.slug?.valor);
      expect(ocupados).toContain('agua-limpa');

      const segunda = await aprovarComSlug(campanha, 'agua-limpa-2');
      const gravou = await repository.salvar(segunda, 0);

      expect(gravou).toBe(true);
      const lida = await repository.findById(campanha.id.toString());
      expect(lida?.slug?.valor).toBe('agua-limpa-2');
    });

    it('a rival fica na mesma empresa, então a nova tentativa com o mesmo slug ainda conflita', async () => {
      const campanha = await guardarAprovada(empresaId);
      repository.forcarConflitoDeSlugNoProximoSalvar();

      await expect(
        repository.salvar(await aprovarComSlug(campanha, 'agua-limpa'), 0),
      ).rejects.toBeInstanceOf(SlugEmUsoError);

      await expect(
        repository.salvar(await aprovarComSlug(campanha, 'agua-limpa'), 0),
      ).rejects.toThrow('Slug já está em uso');
      const rivais = await repository.listarPorEmpresa(
        outraEmpresaId.toString(),
      );
      expect(rivais).toEqual([]);
    });

    it('não dispara em salvar de campanha sem slug', async () => {
      const semSlug = await guardarAprovada(empresaId);
      repository.forcarConflitoDeSlugNoProximoSalvar();

      const gravouSemSlug = await repository.salvar(
        (await repository.findById(semSlug.id.toString()))!,
        0,
      );
      expect(gravouSemSlug).toBe(true);

      const comSlug = await guardarAprovada(empresaId);
      await expect(
        repository.salvar(await aprovarComSlug(comSlug, 'agua-limpa'), 0),
      ).rejects.toBeInstanceOf(SlugEmUsoError);
    });
  });
});
