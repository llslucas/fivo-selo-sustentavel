import { EmpresaJaExisteError } from '@domain/fivo/empresas/errors/empresa-ja-existe.error';
import { EmpresaRepository } from '@domain/fivo/empresas/ports/empresa-repository';
import { UserRepository } from '@domain/fivo/identidade/ports/user-repository';
import { UnitOfWork } from '@domain/fivo/shared/ports/unit-of-work';
import { CriarEmpresaUseCase } from '@domain/fivo/empresas/use-cases/criar-empresa';
import { Empresa } from '@domain/fivo/empresas/entities/empresa';
import { PrismaEmpresaMapper } from '@infra/database/prisma/mappers/prisma-empresa-mapper';
import { FakeHasher } from '@test/doubles/fake-hasher';
import { FakeMailer } from '@test/doubles/fake-mailer';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

type CriarEmpresaRequest = Parameters<CriarEmpresaUseCase['execute']>[0];

function request(
  overrides: Partial<CriarEmpresaRequest> = {},
): CriarEmpresaRequest {
  return {
    razaoSocial: 'Empresa Teste LTDA',
    nomeFantasia: 'Empresa Teste',
    cnpj: '12345678000195',
    email: 'contato@empresateste.com.br',
    senha: 'SenhaForte123',
    telefone: '11999999999',
    cep: '12345678',
    logradouro: 'Rua Teste',
    numero: '123',
    bairro: 'Bairro Teste',
    cidade: 'Cidade Teste',
    uf: 'SP',
    contato: 'João da Silva',
    ...overrides,
  };
}

describe('CriarEmpresaUseCase — transação atômica User + Empresa (e2e)', () => {
  let contexto: AppDeTeste;
  let userRepository: UserRepository;
  let empresaRepository: EmpresaRepository;
  let unitOfWork: UnitOfWork;

  function criarUseCase(repositorioDeEmpresa: EmpresaRepository) {
    return new CriarEmpresaUseCase(
      userRepository,
      repositorioDeEmpresa,
      new FakeHasher(),
      new FakeMailer(),
      unitOfWork,
    );
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    userRepository = contexto.app.get(UserRepository);
    empresaRepository = contexto.app.get(EmpresaRepository);
    unitOfWork = contexto.app.get(UnitOfWork);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('a falha da escrita de Empresa depois da de User não deixa nenhum usuario e libera o e-mail', async () => {
    // Simula a corrida: outro cadastro com o mesmo CNPJ é commitado entre a
    // checagem de unicidade e o INSERT da Empresa.
    const repositorioComConflito: EmpresaRepository = {
      findById: (id) => empresaRepository.findById(id),
      findByCnpj: (cnpj) => empresaRepository.findByCnpj(cnpj),
      findByUsuarioId: (usuarioId) =>
        empresaRepository.findByUsuarioId(usuarioId),
      findByTokenTrocaEmailHash: (hash) =>
        empresaRepository.findByTokenTrocaEmailHash(hash),
      findBySlug: (slug) => empresaRepository.findBySlug(slug),
      listarSlugsComPrefixo: (prefixo) =>
        empresaRepository.listarSlugsComPrefixo(prefixo),
      listarPorEstado: (estado, ordem) =>
        empresaRepository.listarPorEstado(estado, ordem),
      save: (empresa) => empresaRepository.save(empresa),
      salvarTrocaDeEmail: (empresa) =>
        empresaRepository.salvarTrocaDeEmail(empresa),
      salvarTransicao: (empresa, estado) =>
        empresaRepository.salvarTransicao(empresa, estado),
      create: async (empresa: Empresa) => {
        await contexto.prisma.empresa.create({
          data: PrismaEmpresaMapper.toPrisma(EmpresaFactory.create()),
        });

        return empresaRepository.create(empresa);
      },
    };

    await expect(
      criarUseCase(repositorioComConflito).execute(request()),
    ).rejects.toBeInstanceOf(EmpresaJaExisteError);

    expect(await contexto.prisma.usuario.count()).toBe(0);
    expect(
      await userRepository.findByEmail('contato@empresateste.com.br'),
    ).toBeNull();

    const novoCadastro = await criarUseCase(empresaRepository).execute(
      request({ cnpj: '11222333000181' }),
    );

    expect(novoCadastro.isRight()).toBe(true);
    expect(await contexto.prisma.usuario.count()).toBe(1);
  });

  it('dois cadastros paralelos com o mesmo CNPJ resultam em exatamente um sucesso e nenhum usuario órfão', async () => {
    const useCase = criarUseCase(empresaRepository);

    const resultados = await Promise.allSettled([
      useCase.execute(request({ email: 'a@empresateste.com.br' })),
      useCase.execute(request({ email: 'b@empresateste.com.br' })),
    ]);

    const classificados = resultados.map((resultado) => {
      if (resultado.status === 'rejected') {
        return resultado.reason instanceof EmpresaJaExisteError
          ? 'conflito'
          : 'erro-inesperado';
      }

      if (resultado.value.isRight()) {
        return 'sucesso';
      }

      return resultado.value.value instanceof EmpresaJaExisteError
        ? 'conflito'
        : 'erro-inesperado';
    });

    expect([...classificados].sort()).toEqual(['conflito', 'sucesso']);
    expect(await contexto.prisma.empresa.count()).toBe(1);
    expect(await contexto.prisma.usuario.count()).toBe(1);
  });
});
