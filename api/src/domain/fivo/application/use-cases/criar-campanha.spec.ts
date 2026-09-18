import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { RegraType } from '@domain/fivo/entities/campanha';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InMemoryCampanhaRepository } from '@test/repositories/in-memory-campanha-repository';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { CampanhaRepository } from '../ports/database/campanha-repository';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { CriarCampanhaUseCase } from './criar-campanha';
import { InvalidRuleValueError } from '../errors/invalid-rule-value.error';

describe('CriarCampanhaUseCase', () => {
  let campanhaRepository: CampanhaRepository;
  let empresaRepository: EmpresaRepository;
  let instituicaoRepository: InstituicaoRepository;
  let criarCampanhaUseCase: CriarCampanhaUseCase;

  beforeEach(() => {
    campanhaRepository = new InMemoryCampanhaRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    instituicaoRepository = new InMemoryInstituicaoRepository();
    criarCampanhaUseCase = new CriarCampanhaUseCase(
      campanhaRepository,
      empresaRepository,
      instituicaoRepository,
    );
  });

  it('should create a new campaign successfully', async () => {
    const empresa = EmpresaFactory.create();
    const instituicao = InstituicaoFactory.create();

    await empresaRepository.create(empresa);
    await instituicaoRepository.create(instituicao);

    const request = {
      empresa_id: empresa.id.toString(),
      instituicao_id: instituicao.id.toString(),
      nome: 'Campanha Teste',
      descricao: 'Descrição da Campanha Teste',
      regra_tipo: RegraType.VALOR_FIXO,
      regra_valor_brl: 100,
      regra_percentual: 0,
      meta_valor_brl: 1000,
      data_inicio: new Date(),
      data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    const result = await criarCampanhaUseCase.execute(request);

    if (result.isLeft()) {
      throw result.value;
    }

    const createdCampanha = result.value.campanha;

    expect(createdCampanha).toBeDefined();
    expect(createdCampanha?.nome).toBe(request.nome);
    expect(createdCampanha?.descricao).toBe(request.descricao);
  });

  it('should return ResourceNotFoundError if empresa does not exist', async () => {
    const empresa = EmpresaFactory.create();
    const instituicao = InstituicaoFactory.create();

    await instituicaoRepository.create(instituicao);

    const request = {
      empresa_id: empresa.id.toString(),
      instituicao_id: instituicao.id.toString(),
      nome: 'Campanha Teste',
      descricao: 'Descrição da Campanha Teste',
      regra_tipo: RegraType.VALOR_FIXO,
      regra_valor_brl: 100,
      regra_percentual: 0,
      meta_valor_brl: 1000,
      data_inicio: new Date(),
      data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    const result = await criarCampanhaUseCase.execute(request);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should return ResourceNotFoundError if instituicao does not exist', async () => {
    const empresa = EmpresaFactory.create();
    const instituicao = InstituicaoFactory.create();

    await empresaRepository.create(empresa);

    const request = {
      empresa_id: empresa.id.toString(),
      instituicao_id: instituicao.id.toString(),
      nome: 'Campanha Teste',
      descricao: 'Descrição da Campanha Teste',
      regra_tipo: RegraType.VALOR_FIXO,
      regra_valor_brl: 100,
      regra_percentual: 0,
      meta_valor_brl: 1000,
      data_inicio: new Date(),
      data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    const result = await criarCampanhaUseCase.execute(request);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should return InvalidRuleValueError if regra_valor_brl below or equal to 0 with VALOR_FIXO as regra.', async () => {
    const empresa = EmpresaFactory.create();
    const instituicao = InstituicaoFactory.create();

    await empresaRepository.create(empresa);
    await instituicaoRepository.create(instituicao);

    const request = {
      empresa_id: empresa.id.toString(),
      instituicao_id: instituicao.id.toString(),
      nome: 'Campanha Teste',
      descricao: 'Descrição da Campanha Teste',
      regra_tipo: RegraType.VALOR_FIXO,
      regra_valor_brl: 0, // Valor inválido
      regra_percentual: 100,
      meta_valor_brl: 1000,
      data_inicio: new Date(),
      data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    const result = await criarCampanhaUseCase.execute(request);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidRuleValueError);
  });

  it('should return InvalidRuleValueError if regra_percentual is below or equal to 0 with VALOR_PERCENTUAL as regra.', async () => {
    const empresa = EmpresaFactory.create();
    const instituicao = InstituicaoFactory.create();

    await empresaRepository.create(empresa);
    await instituicaoRepository.create(instituicao);

    const request = {
      empresa_id: empresa.id.toString(),
      instituicao_id: instituicao.id.toString(),
      nome: 'Campanha Teste',
      descricao: 'Descrição da Campanha Teste',
      regra_tipo: RegraType.VALOR_PERCENTUAL,
      regra_valor_brl: 100,
      regra_percentual: 0, // Valor inválido
      meta_valor_brl: 1000,
      data_inicio: new Date(),
      data_fim: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    const result = await criarCampanhaUseCase.execute(request);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidRuleValueError);
  });
});
