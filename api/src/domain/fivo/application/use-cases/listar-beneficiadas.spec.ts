import { Causa, CausaStatus } from '@domain/fivo/entities/causa';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';
import { CausaFactory } from '@test/factories/causa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { ListarBeneficiadasUseCase } from './listar-beneficiadas';

describe('ListarBeneficiadasUseCase', () => {
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let causaRepository: InMemoryCausaRepository;
  let sut: ListarBeneficiadasUseCase;

  beforeEach(() => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    causaRepository = new InMemoryCausaRepository();
    sut = new ListarBeneficiadasUseCase(instituicaoRepository, causaRepository);
  });

  async function criarCausa(
    nome: string,
    status: CausaStatus = CausaStatus.ATIVA,
  ) {
    const causa = CausaFactory.create({ nome, status });
    await causaRepository.create(causa);
    return causa;
  }

  async function criarInstituicao(
    nomeFantasia: string,
    causa: Causa,
    status: InstituicaoStatus = InstituicaoStatus.APROVADA,
  ) {
    const instituicao = InstituicaoFactory.create({
      nomeFantasia,
      causaId: causa.id,
      status,
    });
    await instituicaoRepository.create(instituicao);
    return instituicao;
  }

  it('should return an empty list when the catalog is empty', async () => {
    const resultado = await sut.execute();

    expect(resultado).toEqual([]);
  });

  it('should return approved instituicoes and active causas in the public read model', async () => {
    const causa = await criarCausa('Educação');
    const instituicao = await criarInstituicao('Escola Viva', causa);

    const resultado = await sut.execute();

    expect(resultado).toEqual([
      {
        tipo: 'CAUSA',
        id: causa.id.toString(),
        nome: 'Educação',
        causa: null,
        cidade: null,
        uf: null,
        descricao: causa.descricao,
        site: null,
        logoArquivoId: null,
      },
      {
        tipo: 'INSTITUICAO',
        id: instituicao.id.toString(),
        nome: 'Escola Viva',
        causa: 'Educação',
        cidade: instituicao.cidade,
        uf: instituicao.uf,
        descricao: instituicao.descricao,
        site: instituicao.site,
        logoArquivoId: null,
      },
    ]);
  });

  it.each([
    InstituicaoStatus.PENDENTE_APROVACAO,
    InstituicaoStatus.REJEITADA,
    InstituicaoStatus.SUSPENSA,
    InstituicaoStatus.INATIVA,
  ])('should not list an instituicao that is %s', async (status) => {
    const causa = await criarCausa('Educação');
    await criarInstituicao('Escola Viva', causa, status);

    const resultado = await sut.execute();

    expect(resultado.filter((item) => item.tipo === 'INSTITUICAO')).toEqual([]);
  });

  it('should not list an inactive causa', async () => {
    await criarCausa('Educação', CausaStatus.INATIVA);
    await criarCausa('Saúde');

    const resultado = await sut.execute();

    expect(resultado.map((item) => item.nome)).toEqual(['Saúde']);
  });

  it('should order instituicoes and causas together by name, ignoring accents and case', async () => {
    const saude = await criarCausa('Saúde');
    await criarCausa('Animais');
    await criarInstituicao('Casa Esperança', saude);
    await criarInstituicao('Ação Verde', saude);

    const resultado = await sut.execute();

    expect(resultado.map((item) => item.nome)).toEqual([
      'Ação Verde',
      'Animais',
      'Casa Esperança',
      'Saúde',
    ]);
  });

  it('should match "FUNDACAO" with "Fundação" ignoring accents and case', async () => {
    const causa = await criarCausa('Educação');
    await criarInstituicao('Fundação Esperança', causa);
    await criarInstituicao('Escola Viva', causa);

    const resultado = await sut.execute('FUNDACAO');

    expect(resultado.map((item) => item.nome)).toEqual(['Fundação Esperança']);
  });

  it('should match partially on causa names too', async () => {
    const causa = await criarCausa('Educação');
    await criarInstituicao('Escola Viva', causa);

    const resultado = await sut.execute('educ');

    expect(resultado.map((item) => item.nome)).toEqual(['Educação']);
  });

  it('should ignore a search term with fewer than 2 characters and return the whole list', async () => {
    const causa = await criarCausa('Educação');
    await criarInstituicao('Escola Viva', causa);

    const comUmCaractere = await sut.execute('x');
    const vazio = await sut.execute('');
    const semTermo = await sut.execute();

    expect(comUmCaractere).toHaveLength(2);
    expect(vazio).toHaveLength(2);
    expect(semTermo).toHaveLength(2);
  });

  it('should filter with a search term of exactly 2 characters', async () => {
    const causa = await criarCausa('Educação');
    await criarInstituicao('Escola Viva', causa);

    const resultado = await sut.execute('es');

    expect(resultado.map((item) => item.nome)).toEqual(['Escola Viva']);
  });

  it('should return an empty list when the search matches nothing', async () => {
    const causa = await criarCausa('Educação');
    await criarInstituicao('Escola Viva', causa);

    const resultado = await sut.execute('zzzz');

    expect(resultado).toEqual([]);
  });

  it('should never expose cnpj, documento or telefone', async () => {
    const causa = await criarCausa('Educação');
    const instituicao = await criarInstituicao('Escola Viva', causa);

    const resultado = await sut.execute();
    const texto = JSON.stringify(resultado);

    expect(texto).not.toContain(instituicao.cnpj.valor);
    expect(texto).not.toContain(instituicao.documento.arquivoId.toString());
    expect(texto).not.toContain(instituicao.telefone);
  });
});
