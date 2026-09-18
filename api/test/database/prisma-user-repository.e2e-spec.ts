import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { UserAlreadyExistsError } from '@domain/fivo/application/errors/users-already-exists.error';
import { Senha } from '@domain/fivo/entities/senha';
import { UserRole } from '@domain/fivo/entities/user';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

const HASH_DE_SENHA = '$argon2id$v=19$m=65536,t=3,p=4$hash-de-teste';

function senhaJaHasheada(): Senha {
  const senha = Senha.create(HASH_DE_SENHA);

  if (senha.isLeft()) {
    throw new Error('senha de teste inválida');
  }

  return senha.value;
}

describe('PrismaUserRepository (e2e)', () => {
  let contexto: AppDeTeste;
  let repository: UserRepository;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    repository = contexto.app.get(UserRepository);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('create seguido de findById devolve uma entidade equivalente', async () => {
    const user = UserFactory.create({
      nome: 'Maria da Silva',
      email: 'maria@empresa.test',
      senha: senhaJaHasheada(),
      role: UserRole.EMPRESA,
    });

    await repository.create(user);

    const encontrado = await repository.findById(user.id.toString());

    expect(encontrado).not.toBeNull();
    expect(encontrado!.equals(user)).toBe(true);
    expect(encontrado!.nome).toBe('Maria da Silva');
    expect(encontrado!.email).toBe('maria@empresa.test');
    expect(encontrado!.role).toBe(UserRole.EMPRESA);
    expect(encontrado!.senha.valor).toBe(HASH_DE_SENHA);
    expect(encontrado!.falhasLogin).toBe(0);
    expect(encontrado!.bloqueadoAte).toBeNull();
    expect(encontrado!.createdAt.getTime()).toBe(user.createdAt.getTime());
  });

  it('create seguido de findByEmail devolve a mesma entidade', async () => {
    const user = UserFactory.create({
      email: 'login@empresa.test',
      senha: senhaJaHasheada(),
      role: UserRole.EMPRESA,
    });

    await repository.create(user);

    const encontrado = await repository.findByEmail('login@empresa.test');

    expect(encontrado).not.toBeNull();
    expect(encontrado!.id.toString()).toBe(user.id.toString());
    expect(encontrado!.senha.valor).toBe(HASH_DE_SENHA);
  });

  it('findByEmail devolve null quando o e-mail não existe', async () => {
    const encontrado = await repository.findByEmail('ninguem@empresa.test');

    expect(encontrado).toBeNull();
  });

  it('save persiste os contadores de bloqueio de login', async () => {
    const user = UserFactory.create({
      email: 'bloqueio@empresa.test',
      senha: senhaJaHasheada(),
    });

    await repository.create(user);

    const agora = new Date('2026-01-01T10:00:00.000Z');

    for (let tentativa = 0; tentativa < 5; tentativa++) {
      user.registrarFalhaDeLogin(agora);
    }

    await repository.save(user);

    const encontrado = await repository.findById(user.id.toString());

    expect(encontrado!.falhasLogin).toBe(5);
    expect(encontrado!.primeiraFalhaEm?.getTime()).toBe(agora.getTime());
    expect(encontrado!.bloqueadoAte?.getTime()).toBe(
      new Date('2026-01-01T10:15:00.000Z').getTime(),
    );
    expect(encontrado!.estaBloqueado(agora)).toBe(true);
  });

  it('create com e-mail já cadastrado falha com UserAlreadyExistsError (409)', async () => {
    const primeiro = UserFactory.create({
      email: 'duplicado@empresa.test',
      senha: senhaJaHasheada(),
    });
    const segundo = UserFactory.create({
      email: 'duplicado@empresa.test',
      senha: senhaJaHasheada(),
    });

    await repository.create(primeiro);

    await expect(repository.create(segundo)).rejects.toBeInstanceOf(
      UserAlreadyExistsError,
    );
    await expect(repository.create(segundo)).rejects.toMatchObject({
      status: 409,
      message: 'CNPJ ou e-mail já cadastrado',
    });
  });
});
