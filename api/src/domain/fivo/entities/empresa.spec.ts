import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { EmpresaStatus } from './empresa';
import { UserRole } from './user';
import { TransicaoInvalidaError } from '../application/errors/transicao-invalida.error';
import { MotivoInsuficienteError } from '../application/errors/motivo-insuficiente.error';

describe('TransicaoInvalidaError', () => {
  it('carries HTTP status 409', () => {
    expect(new TransicaoInvalidaError().status).toBe(409);
  });
});

describe('Company Aproval', () => {
  it("Should approve a company if it's pending approval", () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });

    const result = empresa.aprovar(admin.id);

    expect(result.isRight()).toBe(true);
  });

  it('Should return a TransacaoInvalidaError if the status is approved.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.APROVADA,
    });

    const result = empresa.aprovar(admin.id);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });

  it('Should return a TransacaoInvalidaError if the status is rejected.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.REJEITADA,
    });

    const result = empresa.aprovar(admin.id);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });

  it('Should return a TransacaoInvalidaError if the status is suspended.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.SUSPENSA,
    });

    const result = empresa.aprovar(admin.id);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });
});

describe('Company Rejection', () => {
  it("Should reject a company if it's pending approval", () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });

    const result = empresa.rejeitar(
      admin.id,
      'Motivo de rejeição suficientemente detalhado',
    );

    expect(result.isRight()).toBe(true);
  });

  it('Should return a TransacaoInvalidaError if the status is approved.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.APROVADA,
    });

    const result = empresa.rejeitar(
      admin.id,
      'Motivo de rejeição suficientemente detalhado',
    );

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });

  it('Should return a TransacaoInvalidaError if the status is rejected.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.REJEITADA,
    });

    const result = empresa.rejeitar(
      admin.id,
      'Motivo de rejeição suficientemente detalhado',
    );

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });

  it('Should return a TransacaoInvalidaError if the status is suspended.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.SUSPENSA,
    });

    const result = empresa.rejeitar(
      admin.id,
      'Motivo de rejeição suficientemente detalhado',
    );

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });

  it('Should return a MotivoInsuficienteError if the reason is empty.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });

    const result = empresa.rejeitar(admin.id, '');

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MotivoInsuficienteError);
  });

  it('Should return a MotivoInsuficienteError if the reason has less than 20 characters.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });

    const result = empresa.rejeitar(admin.id, 'Motivo curto');

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MotivoInsuficienteError);
  });
});

describe('Company Suspension', () => {
  it("Should suspend a company if it's approved", () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.APROVADA,
    });

    const result = empresa.suspender(admin.id);

    expect(result.isRight()).toBe(true);
  });

  it('Should return a TransacaoInvalidaError if the status is suspended.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.SUSPENSA,
    });

    const result = empresa.suspender(admin.id);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });

  it('Should return a TransacaoInvalidaError if the status is rejected.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.REJEITADA,
    });

    const result = empresa.suspender(admin.id);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });

  it('Should return a TransacaoInvalidaError if the status is pending approval.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });

    const result = empresa.suspender(admin.id);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });
});

describe('Company Reactivation', () => {
  it("Should reactivate a company if it's suspended", () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.SUSPENSA,
    });

    const result = empresa.reativar(admin.id);

    expect(result.isRight()).toBe(true);
  });

  it('Should return a TransacaoInvalidaError if the status is approved.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.APROVADA,
    });

    const result = empresa.reativar(admin.id);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });

  it('Should return a TransacaoInvalidaError if the status is rejected.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.REJEITADA,
    });

    const result = empresa.reativar(admin.id);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });

  it('Should return a TransacaoInvalidaError if the status is pending approval.', () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });

    const result = empresa.reativar(admin.id);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
  });
});

describe('Company e-mail change request', () => {
  const agora = new Date('2026-09-20T12:00:00.000Z');

  it('should record the pending e-mail, the token hash and a 24 hour deadline', () => {
    const empresa = EmpresaFactory.create();

    empresa.solicitarTrocaDeEmail('novo@empresa.test', 'hash-do-token', agora);

    expect(empresa.emailPendente).toBe('novo@empresa.test');
    expect(empresa.tokenTrocaEmailHash).toBe('hash-do-token');
    expect(empresa.tokenTrocaEmailExpiraEm).toEqual(
      new Date('2026-09-21T12:00:00.000Z'),
    );
  });

  it('should clear the deadline together with the pending change', () => {
    const empresa = EmpresaFactory.create();
    empresa.solicitarTrocaDeEmail('novo@empresa.test', 'hash-do-token', agora);

    empresa.limparTrocaDeEmail();

    expect(empresa.emailPendente).toBeNull();
    expect(empresa.tokenTrocaEmailHash).toBeNull();
    expect(empresa.tokenTrocaEmailExpiraEm).toBeNull();
  });
});
