import { UserRole } from '@domain/fivo/entities/user';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { Cnpj } from '@domain/fivo/entities/cnpj';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';
import { ListarFilaInstituicoesUseCase } from './listar-fila-instituicoes';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { CausaFactory } from '@test/factories/causa-factory';
import { Causa } from '@domain/fivo/entities/causa';

describe('ListarFilaInstituicoesUseCase', () => {
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let userRepository: InMemoryUserRepository;
  let causaRepository: InMemoryCausaRepository;
  let causa: Causa;
  let sut: ListarFilaInstituicoesUseCase;

  beforeEach(async () => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    userRepository = new InMemoryUserRepository();
    causaRepository = new InMemoryCausaRepository();
    causa = CausaFactory.create({ nome: 'Meio Ambiente' });
    await causaRepository.create(causa);
    sut = new ListarFilaInstituicoesUseCase(
      instituicaoRepository,
      empresaRepository,
      userRepository,
      causaRepository,
    );
  });

  it('should list only PENDENTE_APROVACAO instituicoes, ordered from oldest to newest', async () => {
    const user = UserFactory.create({
      role: UserRole.ADMIN,
    });

    const userMaisAntigo = UserFactory.create({
      email: 'antigo@example.com',
      role: UserRole.INSTITUICAO,
    });

    await userRepository.create(userMaisAntigo);

    const userMaisNovo = UserFactory.create({
      email: 'novo@example.com',
      role: UserRole.INSTITUICAO,
    });

    await userRepository.create(userMaisNovo);

    const userAprovada = UserFactory.create({
      email: 'aprovada@example.com',
      role: UserRole.EMPRESA,
    });

    await userRepository.create(userAprovada);

    const instituicaoMaisAntiga = InstituicaoFactory.create({
      razaoSocial: 'Instituicao Mais Antiga LTDA',
      cnpj: Cnpj.create('12345678000195').value as Cnpj,
      usuarioId: userMaisAntigo.id,
      causaId: causa.id,
      status: InstituicaoStatus.PENDENTE_APROVACAO,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    });

    const instituicaoMaisNova = InstituicaoFactory.create({
      razaoSocial: 'Instituicao Mais Nova LTDA',
      cnpj: Cnpj.create('11444777000161').value as Cnpj,
      usuarioId: userMaisNovo.id,
      causaId: causa.id,
      status: InstituicaoStatus.PENDENTE_APROVACAO,
      createdAt: new Date('2026-01-02T10:00:00Z'),
    });

    const instituicaoAprovada = InstituicaoFactory.create({
      razaoSocial: 'Instituicao Já Aprovada LTDA',
      usuarioId: userAprovada.id,
      status: InstituicaoStatus.APROVADA,
      createdAt: new Date('2025-12-01T10:00:00Z'),
    });

    // Insert out of chronological order to prove the use case sorts, not the fixture.
    await instituicaoRepository.create(instituicaoMaisNova);
    await instituicaoRepository.create(instituicaoAprovada);
    await instituicaoRepository.create(instituicaoMaisAntiga);

    const fila = await sut.execute({ user });

    expect(fila.isRight()).toBe(true);
    expect(fila.value).toHaveLength(2);

    if (fila.isLeft()) {
      throw new Error();
    }

    expect(fila.value.map((item) => item.id)).toEqual([
      instituicaoMaisAntiga.id.toString(),
      instituicaoMaisNova.id.toString(),
    ]);

    expect(fila.value[0]).toEqual({
      id: instituicaoMaisAntiga.id.toString(),
      razaoSocial: 'Instituicao Mais Antiga LTDA',
      cnpj: '12345678000195',
      causa: 'Meio Ambiente',
      cidade: instituicaoMaisAntiga.cidade,
      uf: instituicaoMaisAntiga.uf,
      email: 'antigo@example.com',
      documentoArquivoId: instituicaoMaisAntiga.documento.arquivoId.toString(),
      cnpjCoincideComEmpresa: false,
      createdAt: instituicaoMaisAntiga.createdAt,
    });
  });

  it('should fail with a NotAllowedError if the user is not an admin', async () => {
    const user = UserFactory.create({
      role: UserRole.EMPRESA,
    });

    const userInstituicao = UserFactory.create({
      email: 'antigo@example.com',
      role: UserRole.INSTITUICAO,
    });

    await userRepository.create(userInstituicao);

    const instituicao = InstituicaoFactory.create({
      razaoSocial: 'Instituicao Mais Antiga LTDA',
      cnpj: Cnpj.create('12345678000195').value as Cnpj,
      usuarioId: userInstituicao.id,
      causaId: causa.id,
      status: InstituicaoStatus.PENDENTE_APROVACAO,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    });

    await instituicaoRepository.create(instituicao);

    const fila = await sut.execute({ user });

    expect(fila.isLeft()).toBe(true);
    expect(fila.value).toBeInstanceOf(NotAllowedError);
  });

  it('should mark if the instituicao already has an empresa with the same cnpj', async () => {
    const user = UserFactory.create({
      role: UserRole.ADMIN,
    });

    const userInstituicao = UserFactory.create({
      email: 'antigo@example.com',
      role: UserRole.INSTITUICAO,
    });

    await userRepository.create(userInstituicao);

    const instituicao = InstituicaoFactory.create({
      razaoSocial: 'Instituicao Mais Antiga LTDA',
      cnpj: Cnpj.create('12345678000195').value as Cnpj,
      usuarioId: userInstituicao.id,
      causaId: causa.id,
      status: InstituicaoStatus.PENDENTE_APROVACAO,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    });

    await instituicaoRepository.create(instituicao);

    const empresa = EmpresaFactory.create({
      cnpj: Cnpj.create('12345678000195').value as Cnpj,
    });

    await empresaRepository.create(empresa);

    const fila = await sut.execute({ user });

    expect(fila.isRight()).toBe(true);

    if (fila.isLeft()) {
      throw new Error();
    }

    expect(fila.value.map((item) => item.id)).toEqual([
      instituicao.id.toString(),
    ]);

    expect(fila.value[0]).toEqual({
      id: instituicao.id.toString(),
      razaoSocial: 'Instituicao Mais Antiga LTDA',
      cnpj: '12345678000195',
      causa: 'Meio Ambiente',
      cidade: instituicao.cidade,
      uf: instituicao.uf,
      email: 'antigo@example.com',
      documentoArquivoId: instituicao.documento.arquivoId.toString(),
      cnpjCoincideComEmpresa: true,
      createdAt: instituicao.createdAt,
    });
  });
});
