import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import { UserRole } from '@domain/fivo/entities/user';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { ReativarEmpresaUseCase } from './reativar-empresa';

describe('ReativarEmpresaUseCase', () => {
  let empresaRepository: InMemoryEmpresaRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let sut: ReativarEmpresaUseCase;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    sut = new ReativarEmpresaUseCase(
      empresaRepository,
      registroAuditoriaRepository,
    );
  });

  it('should reactivate a SUSPENSA empresa: set APROVADA and write one audit row', async () => {
    const empresa = EmpresaFactory.create({ status: EmpresaStatus.SUSPENSA });
    await empresaRepository.create(empresa);
    const admin = UserFactory.create({ role: UserRole.ADMIN });

    const response = await sut.execute(empresa.id.toString(), admin);

    expect(response.isRight()).toBe(true);

    const updated = await empresaRepository.findById(empresa.id.toString());
    expect(updated?.status).toBe(EmpresaStatus.APROVADA);
    expect(updated?.decididoPor?.equals(admin.id)).toBe(true);

    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(registroAuditoriaRepository.items[0].dados).toEqual(
      expect.objectContaining({
        estadoAnterior: EmpresaStatus.SUSPENSA,
        estadoNovo: EmpresaStatus.APROVADA,
      }),
    );
  });

  it('should reject with TransicaoInvalidaError (409) when the empresa is not SUSPENSA', async () => {
    const empresa = EmpresaFactory.create({ status: EmpresaStatus.APROVADA });
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
    const empresa = EmpresaFactory.create({ status: EmpresaStatus.SUSPENSA });
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
});
