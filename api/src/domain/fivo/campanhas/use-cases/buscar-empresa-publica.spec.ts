import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { Beneficiada, InstituicaoStatus } from '@domain/fivo/catalogo';
import { Empresa, EmpresaStatus } from '@domain/fivo/empresas';
import { Slug } from '@domain/fivo/shared';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { CampanhaStatus } from '../entities/campanha';
import { DescricaoCampanha } from '../entities/descricao-campanha';
import { NomeCampanha } from '../entities/nome-campanha';
import { DataCalendario } from '../entities/data-calendario';
import { RegraDoacao, TipoRegraDoacao } from '../entities/regra-doacao';
import { Vigencia } from '../entities/vigencia';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { CausaFactory } from '@test/factories/causa-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InMemoryCampanhaRepository } from '@test/doubles/in-memory-campanha-repository';
import { InMemoryCausaRepository } from '@test/doubles/in-memory-causa-repository';
import { InMemoryEmpresaRepository } from '@test/doubles/in-memory-empresa-repository';
import { InMemoryInstituicaoRepository } from '@test/doubles/in-memory-instituicao-repository';
import { BuscarEmpresaPublicaUseCase } from './buscar-empresa-publica';

function data(texto: string): DataCalendario {
  const r = DataCalendario.criar(texto);
  if (r.isLeft()) throw r.value;
  return r.value;
}
function vigencia(inicio: string, fim?: string): Vigencia {
  const r = Vigencia.criar({
    inicio: data(inicio),
    ...(fim && { fim: data(fim) }),
  });
  if (r.isLeft()) throw r.value;
  return r.value;
}
function beneficiada(instituicaoId: string): Beneficiada {
  const r = Beneficiada.criar({ instituicaoId });
  if (r.isLeft()) throw r.value;
  return r.value;
}
function regra(valor: string): RegraDoacao {
  const r = RegraDoacao.criar({ tipo: TipoRegraDoacao.POR_UNIDADE, valor });
  if (r.isLeft()) throw r.value;
  return r.value;
}

describe('BuscarEmpresaPublicaUseCase', () => {
  let empresaRepository: InMemoryEmpresaRepository;
  let campanhaRepository: InMemoryCampanhaRepository;
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let causaRepository: InMemoryCausaRepository;
  let empresa: Empresa;
  let instituicaoId: string;
  let sut: BuscarEmpresaPublicaUseCase;

  beforeEach(async () => {
    empresaRepository = new InMemoryEmpresaRepository();
    campanhaRepository = new InMemoryCampanhaRepository();
    instituicaoRepository = new InMemoryInstituicaoRepository();
    causaRepository = new InMemoryCausaRepository();

    empresa = EmpresaFactory.create({
      status: EmpresaStatus.APROVADA,
      slug: Slug.reconstruir('cafe-serra-verde'),
    });
    await empresaRepository.create(empresa);

    const inst = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(inst);
    instituicaoId = inst.id.toString();

    sut = new BuscarEmpresaPublicaUseCase(
      empresaRepository,
      campanhaRepository,
      instituicaoRepository,
      causaRepository,
    );
  });

  async function aprovadaComSlug(slug: string, decididoEm: Date) {
    const campanha = CampanhaFactory.aprovada({
      empresaId: empresa.id,
      slug: Slug.reconstruir(slug),
      decididoEm,
      beneficiada: beneficiada(instituicaoId),
      regraDoacao: regra('1.50'),
      vigencia: vigencia('2026-10-01'),
    });
    await campanhaRepository.create(campanha);
    return campanha;
  }

  it('returns the exact contract keys for an APROVADA empresa', async () => {
    await aprovadaComSlug('agua-limpa', new Date('2026-10-10'));

    const res = await sut.execute({ slug: 'cafe-serra-verde' });

    expect(res.isRight()).toBe(true);
    if (res.isLeft()) throw res.value;
    expect(Object.keys(res.value).sort()).toEqual(
      [
        'slug',
        'nomeFantasia',
        'cidade',
        'uf',
        'site',
        'temLogo',
        'campanhas',
      ].sort(),
    );
    expect(Object.keys(res.value.campanhas[0]).sort()).toEqual(
      [
        'slug',
        'nome',
        'descricao',
        'beneficiada',
        'regraDoacao',
        'vigencia',
        'situacao',
      ].sort(),
    );
  });

  it('keeps out RASCUNHO, EM_ANALISE, REJEITADA and APROVADA-without-slug campaigns', async () => {
    await aprovadaComSlug('publicada', new Date('2026-10-10'));
    // aprovada sem slug
    const semSlug = CampanhaFactory.aprovada({
      empresaId: empresa.id,
      beneficiada: beneficiada(instituicaoId),
      regraDoacao: regra('1.50'),
      vigencia: vigencia('2026-10-01'),
    });
    await campanhaRepository.create(semSlug);
    // com slug: só o status as tira da página
    await campanhaRepository.create(
      CampanhaFactory.create({
        empresaId: empresa.id,
        slug: Slug.reconstruir('rascunho'),
      }),
    );
    await campanhaRepository.create(
      CampanhaFactory.emAnalise({
        empresaId: empresa.id,
        slug: Slug.reconstruir('em-analise'),
      }),
    );
    await campanhaRepository.create(
      CampanhaFactory.completa({
        empresaId: empresa.id,
        status: CampanhaStatus.REJEITADA,
        slug: Slug.reconstruir('rejeitada'),
      }),
    );

    const res = await sut.execute({ slug: 'cafe-serra-verde' });
    if (res.isLeft()) throw res.value;
    expect(res.value.campanhas).toHaveLength(1);
    expect(res.value.campanhas[0].slug).toBe('publicada');
  });

  it('orders campaigns by approval date, most recent first', async () => {
    await aprovadaComSlug('antiga', new Date('2026-10-01'));
    await aprovadaComSlug('nova', new Date('2026-10-20'));
    await aprovadaComSlug('media', new Date('2026-10-10'));

    const res = await sut.execute({ slug: 'cafe-serra-verde' });
    if (res.isLeft()) throw res.value;
    expect(res.value.campanhas.map((c) => c.slug)).toEqual([
      'nova',
      'media',
      'antiga',
    ]);
  });

  it('exposes the approved commitment, not the pending one', async () => {
    const campanha = CampanhaFactory.aprovadaComAlteracao({
      empresaId: empresa.id,
      slug: Slug.reconstruir('com-alteracao'),
      decididoEm: new Date('2026-10-10'),
      beneficiada: beneficiada(instituicaoId),
      regraDoacao: regra('1.50'),
      vigencia: vigencia('2026-10-01'),
    });
    await campanhaRepository.create(campanha);

    const res = await sut.execute({ slug: 'cafe-serra-verde' });
    if (res.isLeft()) throw res.value;
    // a alteração padrão troca a regra para PERCENTUAL; a pública mostra o aprovado
    expect(res.value.campanhas[0].regraDoacao).toEqual({
      tipo: TipoRegraDoacao.POR_UNIDADE,
      valor: '1.50',
    });
  });

  describe('valores do contrato', () => {
    // 15/10/2026 às 9h em São Paulo
    const agora = new Date('2026-10-15T12:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers({
        now: agora,
        doNotFake: ['nextTick', 'setImmediate'],
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns every value of the empresa and of the campanha', async () => {
      const comLogo = EmpresaFactory.create({
        status: EmpresaStatus.APROVADA,
        slug: Slug.reconstruir('agua-viva'),
        nomeFantasia: 'Água Viva',
        cidade: 'Campinas',
        uf: 'SP',
        site: 'https://aguaviva.com.br',
        logoArquivoId: new UniqueEntityId(),
      });
      await empresaRepository.create(comLogo);
      const inst = InstituicaoFactory.create({
        status: InstituicaoStatus.APROVADA,
        nomeFantasia: 'Instituto Mata Viva',
      });
      await instituicaoRepository.create(inst);

      const nome = NomeCampanha.criar('Garrafa Solidária');
      const descricao = DescricaoCampanha.criar('Cada garrafa doa R$ 2,50.');
      if (nome.isLeft()) throw nome.value;
      if (descricao.isLeft()) throw descricao.value;
      await campanhaRepository.create(
        CampanhaFactory.aprovada({
          empresaId: comLogo.id,
          slug: Slug.reconstruir('garrafa-solidaria'),
          decididoEm: new Date('2026-10-10'),
          nome: nome.value,
          descricao: descricao.value,
          beneficiada: beneficiada(inst.id.toString()),
          regraDoacao: regra('2.50'),
          vigencia: vigencia('2026-10-01', '2026-12-31'),
        }),
      );

      const res = await sut.execute({ slug: 'agua-viva' });

      expect(res.isRight()).toBe(true);
      expect(res.value).toEqual({
        slug: 'agua-viva',
        nomeFantasia: 'Água Viva',
        cidade: 'Campinas',
        uf: 'SP',
        site: 'https://aguaviva.com.br',
        temLogo: true,
        campanhas: [
          {
            slug: 'garrafa-solidaria',
            nome: 'Garrafa Solidária',
            descricao: 'Cada garrafa doa R$ 2,50.',
            beneficiada: { tipo: 'INSTITUICAO', nome: 'Instituto Mata Viva' },
            regraDoacao: { tipo: TipoRegraDoacao.POR_UNIDADE, valor: '2.50' },
            vigencia: { inicio: '2026-10-01', fim: '2026-12-31' },
            situacao: 'EM_ANDAMENTO',
          },
        ],
      });
    });

    it('names a CAUSA beneficiada by the cause name', async () => {
      const causa = CausaFactory.create({ nome: 'Água para Todos' });
      await causaRepository.create(causa);
      const paraCausa = Beneficiada.criar({ causaId: causa.id.toString() });
      if (paraCausa.isLeft()) throw paraCausa.value;
      await campanhaRepository.create(
        CampanhaFactory.aprovada({
          empresaId: empresa.id,
          slug: Slug.reconstruir('agua-para-todos'),
          decididoEm: new Date('2026-10-10'),
          beneficiada: paraCausa.value,
          regraDoacao: regra('1.50'),
          vigencia: vigencia('2026-10-01'),
        }),
      );

      const res = await sut.execute({ slug: 'cafe-serra-verde' });

      expect(res.isRight()).toBe(true);
      if (res.isLeft()) throw res.value;
      expect(res.value.campanhas[0].beneficiada).toEqual({
        tipo: 'CAUSA',
        nome: 'Água para Todos',
      });
    });

    it('temLogo is false for an empresa without logo', async () => {
      const res = await sut.execute({ slug: 'cafe-serra-verde' });

      expect(res.isRight()).toBe(true);
      if (res.isLeft()) throw res.value;
      expect(res.value.temLogo).toBe(false);
    });

    it.each([
      ['NAO_INICIADA', '2026-10-16'],
      ['EM_ANDAMENTO', '2026-10-15'],
    ])(
      'situacao %s when the vigência starts on %s',
      async (situacao, inicio) => {
        await campanhaRepository.create(
          CampanhaFactory.aprovada({
            empresaId: empresa.id,
            slug: Slug.reconstruir('campanha'),
            decididoEm: new Date('2026-10-10'),
            beneficiada: beneficiada(instituicaoId),
            regraDoacao: regra('1.50'),
            vigencia: vigencia(inicio),
          }),
        );

        const res = await sut.execute({ slug: 'cafe-serra-verde' });

        expect(res.isRight()).toBe(true);
        if (res.isLeft()) throw res.value;
        expect(res.value.campanhas[0].situacao).toBe(situacao);
      },
    );
  });

  describe('não encontrada', () => {
    const erro = new ResourceNotFoundError('Empresa não encontrada');

    it('slug inexistente', async () => {
      const res = await sut.execute({ slug: 'nao-existe' });
      expect(res.value).toEqual(erro);
    });

    it.each([
      ['PENDENTE_APROVACAO', EmpresaStatus.PENDENTE_APROVACAO],
      ['REJEITADA', EmpresaStatus.REJEITADA],
      ['SUSPENSA', EmpresaStatus.SUSPENSA],
    ])('empresa %s', async (_label, status) => {
      const outra = EmpresaFactory.create({
        status,
        slug: Slug.reconstruir('outra-empresa'),
      });
      await empresaRepository.create(outra);
      const res = await sut.execute({ slug: 'outra-empresa' });
      expect(res.value).toEqual(erro);
    });
  });
});
