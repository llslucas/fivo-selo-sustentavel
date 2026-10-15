import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { MotivoInsuficienteError } from '../application/errors/motivo-insuficiente.error';
import { TransicaoInvalidaError } from '../application/errors/transicao-invalida.error';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InstituicaoStatus } from './instituicao';

describe('Instituicao transitions', () => {
  const adminId = new UniqueEntityId();

  it('approves a pending institution and records who and when', () => {
    const instituicao = InstituicaoFactory.create();

    const result = instituicao.aprovar(adminId);

    expect(result.isRight()).toBe(true);
    expect(instituicao.status).toBe(InstituicaoStatus.APROVADA);
    expect(instituicao.decididoPor).toEqual(adminId);
    expect(instituicao.decididoEm).toBeInstanceOf(Date);
  });

  it('rejects a pending institution with a sufficient reason', () => {
    const instituicao = InstituicaoFactory.create();
    const motivo = 'Documentacao nao comprova elegibilidade';

    const result = instituicao.rejeitar(adminId, motivo);

    expect(result.isRight()).toBe(true);
    expect(instituicao.status).toBe(InstituicaoStatus.REJEITADA);
    expect(instituicao.decididoPor).toEqual(adminId);
    expect(instituicao.decididoEm).toBeInstanceOf(Date);
    expect(instituicao.motivoDecisao).toBe(motivo);
  });

  it('does not mutate a pending institution when the rejection reason is short', () => {
    const instituicao = InstituicaoFactory.create();

    const result = instituicao.rejeitar(adminId, 'curto');

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MotivoInsuficienteError);
    expect(instituicao.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
    expect(instituicao.decididoPor).toBeUndefined();
    expect(instituicao.decididoEm).toBeUndefined();
  });

  it('suspends an approved institution and records who and when', () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });

    const result = instituicao.suspender(adminId);

    expect(result.isRight()).toBe(true);
    expect(instituicao.status).toBe(InstituicaoStatus.SUSPENSA);
    expect(instituicao.decididoPor).toEqual(adminId);
    expect(instituicao.decididoEm).toBeInstanceOf(Date);
  });

  it('reactivates a suspended institution and records who and when', () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.SUSPENSA,
    });

    const result = instituicao.reativar(adminId);

    expect(result.isRight()).toBe(true);
    expect(instituicao.status).toBe(InstituicaoStatus.APROVADA);
    expect(instituicao.decididoPor).toEqual(adminId);
    expect(instituicao.decididoEm).toBeInstanceOf(Date);
  });

  it('inactivates an approved institution and records who and when', () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });

    const result = instituicao.inativar(adminId);

    expect(result.isRight()).toBe(true);
    expect(instituicao.status).toBe(InstituicaoStatus.INATIVA);
    expect(instituicao.decididoPor).toEqual(adminId);
    expect(instituicao.decididoEm).toBeInstanceOf(Date);
  });

  it('resubmits a rejected institution for analysis', () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.REJEITADA,
    });

    const result = instituicao.reenviarParaAnalise();

    expect(result.isRight()).toBe(true);
    expect(instituicao.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
  });

  it('does not change state when approval is invalid', () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });

    const result = instituicao.aprovar(adminId);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(instituicao.status).toBe(InstituicaoStatus.APROVADA);
  });

  it('does not change state when rejection is invalid', () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.REJEITADA,
    });

    const result = instituicao.rejeitar(
      adminId,
      'Motivo suficientemente detalhado',
    );

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(instituicao.status).toBe(InstituicaoStatus.REJEITADA);
  });

  it('does not change state when suspension is invalid', () => {
    const instituicao = InstituicaoFactory.create();

    const result = instituicao.suspender(adminId);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(instituicao.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
  });

  it('does not change state when reactivation is invalid', () => {
    const instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });

    const result = instituicao.reativar(adminId);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(instituicao.status).toBe(InstituicaoStatus.APROVADA);
  });

  it('does not change state when inactivation is invalid', () => {
    const instituicao = InstituicaoFactory.create();

    const result = instituicao.inativar(adminId);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(instituicao.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
  });

  it('does not change state when resubmission is invalid', () => {
    const instituicao = InstituicaoFactory.create();

    const result = instituicao.reenviarParaAnalise();

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(instituicao.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
  });

  it.each([
    [InstituicaoStatus.PENDENTE_APROVACAO, false],
    [InstituicaoStatus.APROVADA, true],
    [InstituicaoStatus.REJEITADA, false],
    [InstituicaoStatus.SUSPENSA, false],
    [InstituicaoStatus.INATIVA, false],
  ])('reports availability for status %s', (status, disponivel) => {
    const instituicao = InstituicaoFactory.create({ status });

    expect(instituicao.estaDisponivelParaSelecao()).toBe(disponivel);
  });
});
