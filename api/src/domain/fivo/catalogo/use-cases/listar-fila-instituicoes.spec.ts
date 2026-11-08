import { UserRole } from '@domain/fivo/identidade';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryUserRepository } from '@test/doubles/in-memory-user-repository';
import { Cnpj } from '@domain/fivo/shared';
import { InMemoryInstituicaoRepository } from '@test/doubles/in-memory-instituicao-repository';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InstituicaoStatus } from '../entities/instituicao';
import { ListarFilaInstituicoesUseCase } from './listar-fila-instituicoes';
import { InMemoryEmpresaRepository } from '@test/doubles/in-memory-empresa-repository';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InMemoryCausaRepository } from '@test/doubles/in-memory-causa-repository';
import { CausaFactory } from '@test/factories/causa-factory';
import { Causa } from '../entities/causa';
import { FakeVerificadorDeDocumentos } from '@test/doubles/fake-verificador-de-documento';
import { DocumentoValidacao } from '../entities/documento-validacao';

describe('ListarFilaInstituicoesUseCase', () => {
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let userRepository: InMemoryUserRepository;
  let causaRepository: InMemoryCausaRepository;
  let verificador: FakeVerificadorDeDocumentos;
  let causa: Causa;
  let sut: ListarFilaInstituicoesUseCase;

  beforeEach(async () => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    userRepository = new InMemoryUserRepository();
    causaRepository = new InMemoryCausaRepository();
    verificador = new FakeVerificadorDeDocumentos();
    causa = CausaFactory.create({ nome: 'Meio Ambiente' });
    await causaRepository.create(causa);
    sut = new ListarFilaInstituicoesUseCase(
      instituicaoRepository,
      empresaRepository,
      userRepository,
      causaRepository,
      verificador,
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
      documentoDisponivel: true,
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
      documentoDisponivel: true,
      createdAt: instituicao.createdAt,
    });
  });

  it('should flag per item whether the documento is readable, keeping unreadable items in the queue', async () => {
    const user = UserFactory.create({
      role: UserRole.ADMIN,
    });

    const userLegivel = UserFactory.create({
      email: 'legivel@example.com',
      role: UserRole.INSTITUICAO,
    });

    await userRepository.create(userLegivel);

    const userIlegivel = UserFactory.create({
      email: 'ilegivel@example.com',
      role: UserRole.INSTITUICAO,
    });

    await userRepository.create(userIlegivel);

    const instituicaoLegivel = InstituicaoFactory.create({
      razaoSocial: 'Instituicao Documento Legivel LTDA',
      documento: DocumentoValidacao.criar('arquivo-documento-legivel')
        .value as DocumentoValidacao,
      cnpj: Cnpj.create('12345678000195').value as Cnpj,
      usuarioId: userLegivel.id,
      causaId: causa.id,
      status: InstituicaoStatus.PENDENTE_APROVACAO,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    });

    const instituicaoIlegivel = InstituicaoFactory.create({
      razaoSocial: 'Instituicao Documento Ilegivel LTDA',
      documento: DocumentoValidacao.criar('arquivo-documento-ilegivel')
        .value as DocumentoValidacao,
      cnpj: Cnpj.create('11444777000161').value as Cnpj,
      usuarioId: userIlegivel.id,
      causaId: causa.id,
      status: InstituicaoStatus.PENDENTE_APROVACAO,
      createdAt: new Date('2026-01-02T10:00:00Z'),
    });

    await instituicaoRepository.create(instituicaoLegivel);
    await instituicaoRepository.create(instituicaoIlegivel);

    // Só o documento da segunda some do armazenamento.
    verificador.failOnIds = [
      instituicaoIlegivel.documento.arquivoId.toString(),
    ];
    verificador.forceFailure();

    const fila = await sut.execute({ user });

    expect(fila.isRight()).toBe(true);

    if (fila.isLeft()) {
      throw new Error();
    }

    expect(fila.value).toEqual([
      {
        id: instituicaoLegivel.id.toString(),
        razaoSocial: 'Instituicao Documento Legivel LTDA',
        cnpj: '12345678000195',
        causa: 'Meio Ambiente',
        cidade: instituicaoLegivel.cidade,
        uf: instituicaoLegivel.uf,
        email: 'legivel@example.com',
        documentoArquivoId: instituicaoLegivel.documento.arquivoId.toString(),
        cnpjCoincideComEmpresa: false,
        documentoDisponivel: true,
        createdAt: instituicaoLegivel.createdAt,
      },
      {
        id: instituicaoIlegivel.id.toString(),
        razaoSocial: 'Instituicao Documento Ilegivel LTDA',
        cnpj: '11444777000161',
        causa: 'Meio Ambiente',
        cidade: instituicaoIlegivel.cidade,
        uf: instituicaoIlegivel.uf,
        email: 'ilegivel@example.com',
        documentoArquivoId: instituicaoIlegivel.documento.arquivoId.toString(),
        cnpjCoincideComEmpresa: false,
        documentoDisponivel: false,
        createdAt: instituicaoIlegivel.createdAt,
      },
    ]);
  });
});
