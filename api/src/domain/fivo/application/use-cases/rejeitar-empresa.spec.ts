import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { Empresa, EmpresaStatus } from '@domain/fivo/entities/empresa';
import { UserRole } from '@domain/fivo/entities/user';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { MotivoInsuficienteError } from '../errors/motivo-insuficiente.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { TemplateEmail } from '../ports/mailer';
import { RejeitarEmpresaUseCase } from './rejeitar-empresa';

const MOTIVO_VALIDO = 'Documentação incompleta para validar o CNPJ informado.';

describe('RejeitarEmpresaUseCase', () => {
  let empresaRepository: InMemoryEmpresaRepository;
  let userRepository: InMemoryUserRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let mailer: FakeMailer;
  let sut: RejeitarEmpresaUseCase;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    userRepository = new InMemoryUserRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    mailer = new FakeMailer();
    sut = new RejeitarEmpresaUseCase(
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

  async function lerEmpresa(id: string): Promise<Empresa> {
    const empresa = await empresaRepository.findById(id);

    if (!empresa) {
      throw new Error(`Empresa ${id} não encontrada no repositório`);
    }

    return empresa;
  }

  it('should reject with NotAllowedError (403) and change nothing when the user is not an admin', async () => {
    const empresa = await criarEmpresaPendente();
    const naoAdmin = UserFactory.create({ role: UserRole.EMPRESA });

    const response = await sut.execute(
      empresa.id.toString(),
      naoAdmin,
      MOTIVO_VALIDO,
    );

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

    const response = await sut.execute('non-existent-id', admin, MOTIVO_VALIDO);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
    }
  });

  it('should reject with MotivoInsuficienteError (422) when the motivo has less than 20 characters', async () => {
    const empresa = await criarEmpresaPendente();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(
      empresa.id.toString(),
      admin,
      'muito curto',
    );

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(MotivoInsuficienteError);
      if (response.value instanceof MotivoInsuficienteError) {
        expect(response.value.status).toBe(422);
      }
    }

    const empresaInalterada = await empresaRepository.findById(
      empresa.id.toString(),
    );
    expect(empresaInalterada?.status).toBe(EmpresaStatus.PENDENTE_APROVACAO);
  });

  it('should reject an empresa with a valid motivo: set REJEITADA + motivoDecisao, write one audit row and send CADASTRO_REJEITADO with the motivo', async () => {
    const empresa = await criarEmpresaPendente();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(
      empresa.id.toString(),
      admin,
      MOTIVO_VALIDO,
    );

    expect(response.isRight()).toBe(true);

    const empresaRejeitada = await empresaRepository.findById(
      empresa.id.toString(),
    );
    expect(empresaRejeitada?.status).toBe(EmpresaStatus.REJEITADA);
    expect(empresaRejeitada?.motivoDecisao).toBe(MOTIVO_VALIDO);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    const auditoria = registroAuditoriaRepository.items[0];
    expect(auditoria.dados).toEqual(
      expect.objectContaining({
        estadoAnterior: EmpresaStatus.PENDENTE_APROVACAO,
        estadoNovo: EmpresaStatus.REJEITADA,
        motivo: MOTIVO_VALIDO,
      }),
    );

    expect(mailer.mensagens).toHaveLength(1);
    expect(mailer.mensagens[0]).toEqual(
      expect.objectContaining({
        para: 'empresa@example.com',
        template: TemplateEmail.CADASTRO_REJEITADO,
        dados: { motivo: MOTIVO_VALIDO },
      }),
    );
  });

  it('should reject with TransicaoInvalidaError (409) when the empresa is not PENDENTE_APROVACAO', async () => {
    const empresa = await criarEmpresaPendente();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const primeira = await sut.execute(
      empresa.id.toString(),
      admin,
      MOTIVO_VALIDO,
    );
    expect(primeira.isRight()).toBe(true);

    const segunda = await sut.execute(
      empresa.id.toString(),
      admin,
      MOTIVO_VALIDO,
    );

    expect(segunda.isLeft()).toBe(true);
    if (segunda.isLeft()) {
      expect(segunda.value).toBeInstanceOf(TransicaoInvalidaError);
    }
  });

  it('should still return right and reject the empresa when the Mailer fails', async () => {
    mailer.forceFailure();
    const empresa = await criarEmpresaPendente();
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(
      empresa.id.toString(),
      admin,
      MOTIVO_VALIDO,
    );

    expect(response.isRight()).toBe(true);

    const empresaRejeitada = await empresaRepository.findById(
      empresa.id.toString(),
    );
    expect(empresaRejeitada?.status).toBe(EmpresaStatus.REJEITADA);
  });

  it('should keep the winning decision, return TransicaoInvalidaError and leave no audit or e-mail when the stored status changed after the read (CAS of the real double)', async () => {
    const empresa = await criarEmpresaPendente();
    const admin = UserFactory.create({ role: UserRole.ADMIN });
    const outroAdmin = UserFactory.create({ role: UserRole.ADMIN });

    const leituraObsoleta = await lerEmpresa(empresa.id.toString());

    // Outra decisão vence a corrida entre a leitura e a gravação.
    const vencedora = await lerEmpresa(empresa.id.toString());
    vencedora.aprovar(outroAdmin.id);
    await empresaRepository.salvarTransicao(
      vencedora,
      EmpresaStatus.PENDENTE_APROVACAO,
    );

    jest
      .spyOn(empresaRepository, 'findById')
      .mockResolvedValueOnce(leituraObsoleta);

    const response = await sut.execute(
      empresa.id.toString(),
      admin,
      MOTIVO_VALIDO,
    );

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    }

    const guardada = await lerEmpresa(empresa.id.toString());
    expect(guardada.status).toBe(EmpresaStatus.APROVADA);
    expect(guardada.decididoPor?.equals(outroAdmin.id)).toBe(true);
    expect(guardada.motivoDecisao ?? null).toBeNull();
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });
});
