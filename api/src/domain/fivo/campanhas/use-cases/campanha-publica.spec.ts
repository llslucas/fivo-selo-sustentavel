import {
  Beneficiada,
  CausaStatus,
  InstituicaoStatus,
} from '@domain/fivo/catalogo';
import { DataCalendario } from '../entities/data-calendario';
import { Vigencia } from '../entities/vigencia';
import { CausaFactory } from '@test/factories/causa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InMemoryCausaRepository } from '@test/doubles/in-memory-causa-repository';
import { InMemoryInstituicaoRepository } from '@test/doubles/in-memory-instituicao-repository';
import { calcularSituacao, resolverNomeBeneficiada } from './campanha-publica';

function data(texto: string): DataCalendario {
  const resultado = DataCalendario.criar(texto);
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function vigencia(inicio: string): Vigencia {
  const resultado = Vigencia.criar({ inicio: data(inicio) });
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function beneficiada(props: {
  instituicaoId?: string;
  causaId?: string;
}): Beneficiada {
  const resultado = Beneficiada.criar(props);
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

describe('calcularSituacao', () => {
  const hoje = data('2026-10-21');

  it('reports NAO_INICIADA when the campanha starts tomorrow', () => {
    expect(calcularSituacao(vigencia('2026-10-22'), hoje)).toBe('NAO_INICIADA');
  });

  it('reports EM_ANDAMENTO when the campanha starts today', () => {
    expect(calcularSituacao(vigencia('2026-10-21'), hoje)).toBe('EM_ANDAMENTO');
  });
});

describe('resolverNomeBeneficiada', () => {
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let causaRepository: InMemoryCausaRepository;

  beforeEach(() => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    causaRepository = new InMemoryCausaRepository();
  });

  it('resolves an INSTITUICAO by its nomeFantasia', async () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);

    const nome = await resolverNomeBeneficiada(
      beneficiada({ instituicaoId: instituicao.id.toString() }),
      instituicaoRepository,
      causaRepository,
    );

    expect(nome).toBe(instituicao.nomeFantasia);
  });

  it('resolves a CAUSA by its nome', async () => {
    const causa = CausaFactory.create({
      nome: 'Educação para Todos',
      status: CausaStatus.ATIVA,
    });
    await causaRepository.create(causa);

    const nome = await resolverNomeBeneficiada(
      beneficiada({ causaId: causa.id.toString() }),
      instituicaoRepository,
      causaRepository,
    );

    expect(nome).toBe('Educação para Todos');
  });
});
