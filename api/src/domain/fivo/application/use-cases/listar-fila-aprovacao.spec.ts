import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import { UserRole } from '@domain/fivo/entities/user';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { Cnpj } from '@domain/fivo/entities/cnpj';
import { ListarFilaAprovacaoUseCase } from './listar-fila-aprovacao';

describe('ListarFilaAprovacaoUseCase', () => {
  let empresaRepository: InMemoryEmpresaRepository;
  let userRepository: InMemoryUserRepository;
  let sut: ListarFilaAprovacaoUseCase;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    userRepository = new InMemoryUserRepository();
    sut = new ListarFilaAprovacaoUseCase(empresaRepository, userRepository);
  });

  it('should list only PENDENTE_APROVACAO empresas, ordered from oldest to newest, projecting id/razaoSocial/cnpj/email/createdAt', async () => {
    const cnpjMaisAntiga = Cnpj.create('12345678000195');
    const cnpjMaisNova = Cnpj.create('11444777000161');
    if (cnpjMaisAntiga.isLeft() || cnpjMaisNova.isLeft()) {
      throw new Error('invalid cnpj fixture');
    }

    const userMaisAntiga = UserFactory.create({
      email: 'antiga@example.com',
      role: UserRole.EMPRESA,
    });
    await userRepository.create(userMaisAntiga);

    const userMaisNova = UserFactory.create({
      email: 'nova@example.com',
      role: UserRole.EMPRESA,
    });
    await userRepository.create(userMaisNova);

    const userAprovada = UserFactory.create({
      email: 'aprovada@example.com',
      role: UserRole.EMPRESA,
    });
    await userRepository.create(userAprovada);

    const empresaMaisAntiga = EmpresaFactory.create({
      razaoSocial: 'Empresa Mais Antiga LTDA',
      cnpj: cnpjMaisAntiga.value,
      usuarioId: userMaisAntiga.id,
      status: EmpresaStatus.PENDENTE_APROVACAO,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    });
    const empresaMaisNova = EmpresaFactory.create({
      razaoSocial: 'Empresa Mais Nova LTDA',
      cnpj: cnpjMaisNova.value,
      usuarioId: userMaisNova.id,
      status: EmpresaStatus.PENDENTE_APROVACAO,
      createdAt: new Date('2026-01-02T10:00:00Z'),
    });
    const empresaAprovada = EmpresaFactory.create({
      razaoSocial: 'Empresa Já Aprovada LTDA',
      usuarioId: userAprovada.id,
      status: EmpresaStatus.APROVADA,
      createdAt: new Date('2025-12-01T10:00:00Z'),
    });

    // Insert out of chronological order to prove the use case sorts, not the fixture.
    await empresaRepository.create(empresaMaisNova);
    await empresaRepository.create(empresaAprovada);
    await empresaRepository.create(empresaMaisAntiga);

    const fila = await sut.execute();

    expect(fila).toHaveLength(2);
    expect(fila.map((item) => item.id)).toEqual([
      empresaMaisAntiga.id.toString(),
      empresaMaisNova.id.toString(),
    ]);
    expect(fila[0]).toEqual({
      id: empresaMaisAntiga.id.toString(),
      razaoSocial: 'Empresa Mais Antiga LTDA',
      cnpj: '12345678000195',
      email: 'antiga@example.com',
      createdAt: empresaMaisAntiga.createdAt,
    });
  });
});
