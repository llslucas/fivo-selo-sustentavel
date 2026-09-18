import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { AssegurarEmpresaAprovadaUseCase } from './assegurar-empresa-aprovada';

describe('AssegurarEmpresaAprovadaUseCase', () => {
  let empresaRepository: InMemoryEmpresaRepository;
  let sut: AssegurarEmpresaAprovadaUseCase;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    sut = new AssegurarEmpresaAprovadaUseCase(empresaRepository);
  });

  it('should return right for an APROVADA empresa', async () => {
    const empresa = EmpresaFactory.create({ status: EmpresaStatus.APROVADA });
    await empresaRepository.create(empresa);

    const response = await sut.execute(empresa.id.toString());

    expect(response.isRight()).toBe(true);
  });

  it.each([
    EmpresaStatus.PENDENTE_APROVACAO,
    EmpresaStatus.REJEITADA,
    EmpresaStatus.SUSPENSA,
  ])(
    'should reject with NotAllowedError (403) "Cadastro ainda não aprovado" for %s',
    async (status) => {
      const empresa = EmpresaFactory.create({ status });
      await empresaRepository.create(empresa);

      const response = await sut.execute(empresa.id.toString());

      expect(response.isLeft()).toBe(true);
      if (response.isLeft()) {
        expect(response.value).toBeInstanceOf(NotAllowedError);
        expect(response.value.message).toBe('Cadastro ainda não aprovado');
      }
    },
  );

  it('should reject with ResourceNotFoundError (404) when the empresa does not exist', async () => {
    const response = await sut.execute('non-existent-id');

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
    }
  });
});
