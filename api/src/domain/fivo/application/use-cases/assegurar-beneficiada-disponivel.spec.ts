import { Causa, CausaStatus } from '@domain/fivo/entities/causa';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';
import { CausaFactory } from '@test/factories/causa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { BeneficiadaAmbiguaError } from '../errors/beneficiada-ambigua.error';
import { BeneficiadaIndisponivelError } from '../errors/beneficiada-indisponivel.error';
import { AssegurarBeneficiadaDisponivelUseCase } from './assegurar-beneficiada-disponivel';

describe('AssegurarBeneficiadaDisponivelUseCase', () => {
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let causaRepository: InMemoryCausaRepository;
  let sut: AssegurarBeneficiadaDisponivelUseCase;

  beforeEach(() => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    causaRepository = new InMemoryCausaRepository();
    sut = new AssegurarBeneficiadaDisponivelUseCase(
      instituicaoRepository,
      causaRepository,
    );
  });

  async function criarCausa(
    status: CausaStatus = CausaStatus.ATIVA,
  ): Promise<Causa> {
    const causa = CausaFactory.create({ status });
    await causaRepository.create(causa);
    return causa;
  }

  async function criarInstituicao(
    causa: Causa,
    status: InstituicaoStatus = InstituicaoStatus.APROVADA,
  ): Promise<Instituicao> {
    const instituicao = InstituicaoFactory.create({
      causaId: causa.id,
      status,
    });
    await instituicaoRepository.create(instituicao);
    return instituicao;
  }

  it('should reject with BeneficiadaAmbiguaError (422) when both instituicao and causa are given', async () => {
    const causa = await criarCausa();
    const instituicao = await criarInstituicao(causa);

    const response = await sut.execute({
      instituicaoId: instituicao.id.toString(),
      causaId: causa.id.toString(),
    });

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(BeneficiadaAmbiguaError);
      expect(response.value.status).toBe(422);
    }
  });

  it('should reject with BeneficiadaAmbiguaError (422) when neither is given', async () => {
    const response = await sut.execute({});

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(BeneficiadaAmbiguaError);
    }
  });

  it('should return right for an APROVADA instituicao', async () => {
    const causa = await criarCausa();
    const instituicao = await criarInstituicao(causa);

    const response = await sut.execute({
      instituicaoId: instituicao.id.toString(),
    });

    expect(response.isRight()).toBe(true);
  });

  it('should return right for an ATIVA causa', async () => {
    const causa = await criarCausa();

    const response = await sut.execute({ causaId: causa.id.toString() });

    expect(response.isRight()).toBe(true);
  });

  it.each([
    InstituicaoStatus.PENDENTE_APROVACAO,
    InstituicaoStatus.REJEITADA,
    InstituicaoStatus.SUSPENSA,
    InstituicaoStatus.INATIVA,
  ])(
    'should reject with BeneficiadaIndisponivelError (422) when the instituicao is %s',
    async (status) => {
      const causa = await criarCausa();
      const instituicao = await criarInstituicao(causa, status);

      const response = await sut.execute({
        instituicaoId: instituicao.id.toString(),
      });

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(BeneficiadaIndisponivelError);
      expect(response.value).toMatchObject({
        status: 422,
        message: 'Instituição ou causa indisponível',
      });
    },
  );

  it('should reject with BeneficiadaIndisponivelError when the instituicao does not exist', async () => {
    const response = await sut.execute({ instituicaoId: 'non-existent-id' });

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(BeneficiadaIndisponivelError);
    expect(response.value).toMatchObject({
      status: 422,
      message: 'Instituição ou causa indisponível',
    });
  });

  it('should reject with BeneficiadaIndisponivelError when the causa is INATIVA', async () => {
    const causa = await criarCausa(CausaStatus.INATIVA);

    const response = await sut.execute({ causaId: causa.id.toString() });

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(BeneficiadaIndisponivelError);
    expect(response.value).toMatchObject({
      status: 422,
      message: 'Instituição ou causa indisponível',
    });
  });

  it('should reject with BeneficiadaIndisponivelError when the causa does not exist', async () => {
    const response = await sut.execute({ causaId: 'non-existent-id' });

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(BeneficiadaIndisponivelError);
    expect(response.value).toMatchObject({
      status: 422,
      message: 'Instituição ou causa indisponível',
    });
  });
});
