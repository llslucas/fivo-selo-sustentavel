import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import { UserRole } from '@domain/fivo/entities/user';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { TemplateEmail } from '../ports/mailer';
import { AprovarEmpresaUseCase } from './aprovar-empresa';

describe('AprovarEmpresaUseCase', () => {
  let empresaRepository: InMemoryEmpresaRepository;
  let userRepository: InMemoryUserRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let mailer: FakeMailer;
  let sut: AprovarEmpresaUseCase;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    userRepository = new InMemoryUserRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    mailer = new FakeMailer();
    sut = new AprovarEmpresaUseCase(
      empresaRepository,
      userRepository,
      registroAuditoriaRepository,
      mailer,
    );
  });

  async function criarEmpresaPendente() {
    const empresaUser = UserFactory.create({
      email: 'empresa@example.com',
      role: UserRole.EMPRESA,
    });
    await userRepository.create(empresaUser);

    const empresa = EmpresaFactory.create({
      usuarioId: empresaUser.id,
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });
    await empresaRepository.create(empresa);

    return empresa;
  }

  it('should reject with NotAllowedError (403) and change nothing when the user is not an admin', async () => {
    const empresa = await criarEmpresaPendente();
    const naoAdmin = UserFactory.create({ role: UserRole.EMPRESA });

    const response = await sut.execute(empresa.id.toString(), naoAdmin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(NotAllowedError);
    }

    const empresaInalterada = await empresaRepository.findById(
      empresa.id.toString(),
    );
    expect(empresaInalterada?.status).toBe(EmpresaStatus.PENDENTE_APROVACAO);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });

  it('should reject with ResourceNotFoundError (404) when the empresa does not exist', async () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute('non-existent-id', admin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
    }
  });

  it('should approve a PENDENTE_APROVACAO empresa: set APROVADA + decididoPor/decididoEm, write one audit row and send CADASTRO_APROVADO', async () => {
    const empresa = await criarEmpresaPendente();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(empresa.id.toString(), admin);

    expect(response.isRight()).toBe(true);

    const empresaAprovada = await empresaRepository.findById(
      empresa.id.toString(),
    );
    expect(empresaAprovada?.status).toBe(EmpresaStatus.APROVADA);
    expect(empresaAprovada?.decididoPor?.equals(admin.id)).toBe(true);
    expect(empresaAprovada?.decididoEm).toBeInstanceOf(Date);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    const auditoria = registroAuditoriaRepository.items[0];
    expect(auditoria.usuarioId).toBe(admin.id.toString());
    expect(auditoria.entidadeId).toBe(empresa.id.toString());
    expect(auditoria.dados).toEqual(
      expect.objectContaining({
        estadoAnterior: EmpresaStatus.PENDENTE_APROVACAO,
        estadoNovo: EmpresaStatus.APROVADA,
      }),
    );

    expect(mailer.mensagens).toHaveLength(1);
    expect(mailer.mensagens[0]).toEqual(
      expect.objectContaining({
        para: 'empresa@example.com',
        template: TemplateEmail.CADASTRO_APROVADO,
      }),
    );
  });

  it('should reject with TransicaoInvalidaError (409) when the empresa is not PENDENTE_APROVACAO', async () => {
    const empresa = await criarEmpresaPendente();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const primeira = await sut.execute(empresa.id.toString(), admin);
    expect(primeira.isRight()).toBe(true);

    const segunda = await sut.execute(empresa.id.toString(), admin);

    expect(segunda.isLeft()).toBe(true);
    if (segunda.isLeft()) {
      expect(segunda.value).toBeInstanceOf(TransicaoInvalidaError);
    }
  });

  it('should still return right and approve the empresa when the Mailer fails', async () => {
    mailer.forceFailure();
    const empresa = await criarEmpresaPendente();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(empresa.id.toString(), admin);

    expect(response.isRight()).toBe(true);

    const empresaAprovada = await empresaRepository.findById(
      empresa.id.toString(),
    );
    expect(empresaAprovada?.status).toBe(EmpresaStatus.APROVADA);
  });

  it('should return TransicaoInvalidaError and leave no audit or e-mail when another decision wins the race', async () => {
    const empresa = await criarEmpresaPendente();
    const admin = UserFactory.create({ role: UserRole.ADMIN });
    jest
      .spyOn(empresaRepository, 'salvarTransicao')
      .mockResolvedValueOnce(false);

    const response = await sut.execute(empresa.id.toString(), admin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    }
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });
});
