import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { TipoRegraDoacao } from '@domain/fivo/entities/regra-doacao';
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
      regra_tipo: TipoRegraDoacao.POR_UNIDADE,
      regra_valor: '100',
      meta_valor: '1000',
      data_inicio: '2026-11-01',
      data_fim: '2026-11-08',
    };

    const result = await criarCampanhaUseCase.execute(request);

    if (result.isLeft()) {
      throw result.value;
    }

    const createdCampanha = result.value.campanha;

    expect(createdCampanha).toBeDefined();
    expect(createdCampanha?.nome.valor).toBe(request.nome);
    expect(createdCampanha?.descricao?.valor).toBe(request.descricao);
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
      regra_tipo: TipoRegraDoacao.POR_UNIDADE,
      regra_valor: '100',
      meta_valor: '1000',
      data_inicio: '2026-11-01',
      data_fim: '2026-11-08',
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
      regra_tipo: TipoRegraDoacao.POR_UNIDADE,
      regra_valor: '100',
      meta_valor: '1000',
      data_inicio: '2026-11-01',
      data_fim: '2026-11-08',
    };

    const result = await criarCampanhaUseCase.execute(request);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(ResourceNotFoundError);
  });

  it('should return InvalidRuleValueError if regra_percentual is sent with POR_UNIDADE as regra.', async () => {
    const empresa = EmpresaFactory.create();
    const instituicao = InstituicaoFactory.create();

    await empresaRepository.create(empresa);
    await instituicaoRepository.create(instituicao);

    const request = {
      empresa_id: empresa.id.toString(),
      instituicao_id: instituicao.id.toString(),
      nome: 'Campanha Teste',
      descricao: 'Descrição da Campanha Teste',
      regra_tipo: TipoRegraDoacao.POR_UNIDADE,
      regra_valor: '1',
      regra_percentual: '100', // Indevido para POR_UNIDADE
      meta_valor: '1000',
      data_inicio: '2026-11-01',
      data_fim: '2026-11-08',
    };

    const result = await criarCampanhaUseCase.execute(request);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidRuleValueError);
  });

  it('should return InvalidRuleValueError if regra_valor is sent with PERCENTUAL as regra.', async () => {
    const empresa = EmpresaFactory.create();
    const instituicao = InstituicaoFactory.create();

    await empresaRepository.create(empresa);
    await instituicaoRepository.create(instituicao);

    const request = {
      empresa_id: empresa.id.toString(),
      instituicao_id: instituicao.id.toString(),
      nome: 'Campanha Teste',
      descricao: 'Descrição da Campanha Teste',
      regra_tipo: TipoRegraDoacao.PERCENTUAL,
      regra_valor: '100', // Indevido para PERCENTUAL
      regra_percentual: '10',
      meta_valor: '1000',
      data_inicio: '2026-11-01',
      data_fim: '2026-11-08',
    };

    const result = await criarCampanhaUseCase.execute(request);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidRuleValueError);
  });
});
