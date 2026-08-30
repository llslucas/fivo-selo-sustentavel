import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { Hasher } from '../ports/hasher';
import { EmpresaRepository } from '../ports/repository';
import { CriarEmpresaUseCase } from './criar-empresa';
import { FakeHasher } from '@test/cryptography/fake-hasher';

describe('CriarEmpresaUseCase', () => {
  let criarEmpresaUseCase: CriarEmpresaUseCase;
  let empresaRepository: EmpresaRepository;
  let hasher: Hasher;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    hasher = new FakeHasher();
    criarEmpresaUseCase = new CriarEmpresaUseCase(empresaRepository, hasher);
  });

  it('should create a new empresa with hashed password', async () => {
    const request = {
      razaoSocial: 'Empresa Teste LTDA',
      nomeFantasia: 'Empresa Teste',
      cnpj: '12345678000195',
      email: 'empresa@teste.com',
      senha: 'senha123',
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
      expect(empresa.senha).toEqual(await hasher.hash(request.senha));
    }
  });
});
