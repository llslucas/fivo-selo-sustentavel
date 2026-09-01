import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { CriarEmpresaUseCase } from './criar-empresa';

describe('CriarEmpresaUseCase', () => {
  let criarEmpresaUseCase: CriarEmpresaUseCase;
  let empresaRepository: EmpresaRepository;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    criarEmpresaUseCase = new CriarEmpresaUseCase(empresaRepository);
  });

  it('should create a new empresa', async () => {
    const request = {
      razaoSocial: 'Empresa Teste LTDA',
      nomeFantasia: 'Empresa Teste',
      cnpj: '12345678000195',
      telefone: '11999999999',
      cep: '12345678',
      logradouro: 'Rua Teste',
      numero: 123,
      complemento: 'Apto 101',
      bairro: 'Bairro Teste',
      cidade: 'Cidade Teste',
      uf: 'SP',
    };

    const response = await criarEmpresaUseCase.execute(request);

    const success = response.isRight();

    expect(success).toBe(true);

    if (success) {
      const { empresa } = response.value;

      const empresaInRepository = await empresaRepository.findById(
        empresa.id.toString(),
      );

      expect(empresaInRepository).not.toBeNull();
      expect(empresaInRepository?.equals(empresa)).toBe(true);
    }
  });
});
