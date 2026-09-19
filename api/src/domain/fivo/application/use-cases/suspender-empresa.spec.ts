import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { Empresa, EmpresaStatus } from '@domain/fivo/entities/empresa';
import { UserRole } from '@domain/fivo/entities/user';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { SuspenderEmpresaUseCase } from './suspender-empresa';

describe('SuspenderEmpresaUseCase', () => {
  let empresaRepository: InMemoryEmpresaRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let sut: SuspenderEmpresaUseCase;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    sut = new SuspenderEmpresaUseCase(
      empresaRepository,
      registroAuditoriaRepository,
    );
  });

  async function lerEmpresa(id: string): Promise<Empresa> {
    const empresa = await empresaRepository.findById(id);

    if (!empresa) {
      throw new Error(`Empresa ${id} não encontrada no repositório`);
    }

    return empresa;
  }

  it('should suspend an APROVADA empresa: set SUSPENSA and write one audit row', async () => {
    const empresa = EmpresaFactory.create({ status: EmpresaStatus.APROVADA });
    await empresaRepository.create(empresa);
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(empresa.id.toString(), admin);

    expect(response.isRight()).toBe(true);

    const updated = await empresaRepository.findById(empresa.id.toString());
    expect(updated?.status).toBe(EmpresaStatus.SUSPENSA);
    expect(updated?.decididoPor?.equals(admin.id)).toBe(true);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(registroAuditoriaRepository.items[0].dados).toEqual(
      expect.objectContaining({
        estadoAnterior: EmpresaStatus.APROVADA,
        estadoNovo: EmpresaStatus.SUSPENSA,
      }),
    );
  });

  it('should reject with TransicaoInvalidaError (409) when the empresa is not APROVADA', async () => {
    const empresa = EmpresaFactory.create({
      status: EmpresaStatus.PENDENTE_APROVACAO,
    });
    await empresaRepository.create(empresa);
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(empresa.id.toString(), admin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    }
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });

  it('should reject with NotAllowedError (403) when the user is not an admin', async () => {
    const empresa = EmpresaFactory.create({ status: EmpresaStatus.APROVADA });
    await empresaRepository.create(empresa);
    const naoAdmin = UserFactory.create({ role: UserRole.EMPRESA });

    const response = await sut.execute(empresa.id.toString(), naoAdmin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(NotAllowedError);
    }
  });

  it('should reject with ResourceNotFoundError (404) when the empresa does not exist', async () => {
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute('non-existent-id', admin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
    }
  });

  it('should keep the winning decision, return TransicaoInvalidaError and leave no audit when the stored status changed after the read (CAS of the real double)', async () => {
    const empresa = EmpresaFactory.create({ status: EmpresaStatus.APROVADA });
    await empresaRepository.create(empresa);
    const admin = UserFactory.create({ role: UserRole.ADMIN });
    const outroAdmin = UserFactory.create({ role: UserRole.ADMIN });

    const leituraObsoleta = await lerEmpresa(empresa.id.toString());

    // Outra suspensão vence a corrida entre a leitura e a gravação.
    const vencedora = await lerEmpresa(empresa.id.toString());
    vencedora.suspender(outroAdmin.id);
    await empresaRepository.salvarTransicao(vencedora, EmpresaStatus.APROVADA);

    jest
      .spyOn(empresaRepository, 'findById')
      .mockResolvedValueOnce(leituraObsoleta);

    const response = await sut.execute(empresa.id.toString(), admin);

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    }

    const guardada = await lerEmpresa(empresa.id.toString());
    expect(guardada.status).toBe(EmpresaStatus.SUSPENSA);
    expect(guardada.decididoPor?.equals(outroAdmin.id)).toBe(true);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });
});
