import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { EmpresaAlreadyExistsError } from '@domain/fivo/application/errors/empresa-already-exists.error';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Cnpj } from '@domain/fivo/entities/cnpj';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import { UserRole } from '@domain/fivo/entities/user';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

const CNPJ_A = '11223344000186';
const CNPJ_B = '22334455000186';
const CNPJ_C = '33445566000186';

function cnpj(digitos: string): Cnpj {
  const resultado = Cnpj.create(digitos);

  if (resultado.isLeft()) {
    throw new Error(`CNPJ de teste inválido: ${digitos}`);
  }

  return resultado.value;
}

describe('PrismaEmpresaRepository (e2e)', () => {
  let contexto: AppDeTeste;
  let repository: EmpresaRepository;
  let userRepository: UserRepository;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    repository = contexto.app.get(EmpresaRepository);
    userRepository = contexto.app.get(UserRepository);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('create seguido de findById devolve uma entidade equivalente', async () => {
    const empresa = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      razaoSocial: 'Fivo Comércio LTDA',
      nomeFantasia: 'Fivo',
      numero: 's/n',
      complemento: undefined,
    });

    await repository.create(empresa);

    const encontrada = await repository.findById(empresa.id.toString());

    expect(encontrada).not.toBeNull();
    expect(encontrada!.equals(empresa)).toBe(true);
    expect(encontrada!.razaoSocial).toBe('Fivo Comércio LTDA');
    expect(encontrada!.nomeFantasia).toBe('Fivo');
    expect(encontrada!.cnpj.valor).toBe(CNPJ_A);
    expect(encontrada!.numero).toBe('s/n');
    expect(encontrada!.uf).toBe('SP');
    expect(encontrada!.site).toBe(empresa.site);
    expect(encontrada!.contato).toBe(empresa.contato);
    expect(encontrada!.status).toBe(EmpresaStatus.PENDENTE_APROVACAO);
    expect(encontrada!.createdAt.getTime()).toBe(empresa.createdAt.getTime());
  });

  it('create seguido de findByCnpj devolve a mesma entidade', async () => {
    const empresa = EmpresaFactory.create({ cnpj: cnpj(CNPJ_B) });

    await repository.create(empresa);

    const encontrada = await repository.findByCnpj(CNPJ_B);

    expect(encontrada).not.toBeNull();
    expect(encontrada!.id.toString()).toBe(empresa.id.toString());
    expect(encontrada!.cnpj.valor).toBe(CNPJ_B);
  });

  it('findByCnpj devolve null quando o CNPJ não existe', async () => {
    const encontrada = await repository.findByCnpj(CNPJ_C);

    expect(encontrada).toBeNull();
  });

  it('persiste o vínculo 1-1 com o usuário', async () => {
    const user = UserFactory.create({
      email: 'vinculo@empresa.test',
      role: UserRole.EMPRESA,
    });

    await userRepository.create(user);

    const empresa = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      usuarioId: user.id,
    });

    await repository.create(empresa);

    const encontrada = await repository.findById(empresa.id.toString());

    expect(encontrada!.usuarioId?.toString()).toBe(user.id.toString());
  });

  it('listarPorEstado filtra pelo status e ordena por data de cadastro (asc)', async () => {
    const maisAntiga = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      nomeFantasia: 'Mais antiga',
      createdAt: new Date('2026-01-01T09:00:00.000Z'),
    });
    const maisNova = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_B),
      nomeFantasia: 'Mais nova',
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
    });
    const aprovada = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_C),
      nomeFantasia: 'Já aprovada',
      status: EmpresaStatus.APROVADA,
      createdAt: new Date('2026-02-01T09:00:00.000Z'),
    });

    await repository.create(maisNova);
    await repository.create(maisAntiga);
    await repository.create(aprovada);

    const fila = await repository.listarPorEstado(
      EmpresaStatus.PENDENTE_APROVACAO,
      'asc',
    );

    expect(fila.map((empresa) => empresa.nomeFantasia)).toEqual([
      'Mais antiga',
      'Mais nova',
    ]);
  });

  it('listarPorEstado com ordem desc devolve as mais recentes primeiro', async () => {
    const maisAntiga = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_A),
      nomeFantasia: 'Mais antiga',
      createdAt: new Date('2026-01-01T09:00:00.000Z'),
    });
    const maisNova = EmpresaFactory.create({
      cnpj: cnpj(CNPJ_B),
      nomeFantasia: 'Mais nova',
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
    });

    await repository.create(maisAntiga);
    await repository.create(maisNova);

    const fila = await repository.listarPorEstado(
      EmpresaStatus.PENDENTE_APROVACAO,
      'desc',
    );

    expect(fila.map((empresa) => empresa.nomeFantasia)).toEqual([
      'Mais nova',
      'Mais antiga',
    ]);
  });

  it('save persiste a transição de estado com autor e data da decisão', async () => {
    const empresa = EmpresaFactory.create({ cnpj: cnpj(CNPJ_A) });
    const adminId = new UniqueEntityId();

    await repository.create(empresa);

    const resultado = empresa.aprovar(adminId);
    expect(resultado.isRight()).toBe(true);

    await repository.save(empresa);

    const encontrada = await repository.findById(empresa.id.toString());

    expect(encontrada!.status).toBe(EmpresaStatus.APROVADA);
    expect(encontrada!.decididoPor?.toString()).toBe(adminId.toString());
    expect(encontrada!.decididoEm?.getTime()).toBe(
      empresa.decididoEm!.getTime(),
    );
  });

  it('create com CNPJ já cadastrado falha com EmpresaAlreadyExistsError (409)', async () => {
    const primeira = EmpresaFactory.create({ cnpj: cnpj(CNPJ_A) });
    const segunda = EmpresaFactory.create({ cnpj: cnpj(CNPJ_A) });

    await repository.create(primeira);

    await expect(repository.create(segunda)).rejects.toBeInstanceOf(
      EmpresaAlreadyExistsError,
    );
    await expect(repository.create(segunda)).rejects.toMatchObject({
      status: 409,
      message: 'CNPJ ou e-mail já cadastrado',
    });
  });
});
