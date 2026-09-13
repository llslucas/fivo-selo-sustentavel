import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { EmpresaStatus } from './empresa';
import { UserRole } from './user';
import { TransicaoInvalidaError } from '../application/errors/transicao-invalida.error';
import { MotivoInsuficienteError } from '../application/errors/motivo-insuficiente.error';

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
