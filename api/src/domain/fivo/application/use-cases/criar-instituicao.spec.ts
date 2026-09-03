import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { CriarInstituicaoUseCase } from './criar-instituicao';

describe('CriarInstituicaoUseCase', () => {
  let criarInstituicaoUseCase: CriarInstituicaoUseCase;
  let instituicaoRepository: InstituicaoRepository;

  beforeEach(() => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    criarInstituicaoUseCase = new CriarInstituicaoUseCase(
      instituicaoRepository,
    );
  });

  it('should create a new instituicao', async () => {
    const request = {
      razaoSocial: 'Instituicao Teste LTDA',
      nomeFantasia: 'Instituicao Teste',
      cnpj: '12345678000195',
      telefone: '11999999999',
      cep: '12345678',
      logradouro: 'Rua Teste',
      numero: 123,
      complemento: 'Apto 101',
      bairro: 'Bairro Teste',
      cidade: 'Cidade Teste',
      uf: 'SP',
      site: 'https://www.instituicaoteste.com.br',
      email: 'contato@instituicaoteste.com.br',
      contato: 'João da Silva',
    };

    const response = await criarInstituicaoUseCase.execute(request);

    const success = response.isRight();

    expect(success).toBe(true);

    if (success) {
      const { instituicao } = response.value;

      const instituicaoInRepository = await instituicaoRepository.findById(
        instituicao.id.toString(),
      );

      expect(instituicaoInRepository).not.toBeNull();
      expect(instituicaoInRepository?.equals(instituicao)).toBe(true);
    }
  });
});
