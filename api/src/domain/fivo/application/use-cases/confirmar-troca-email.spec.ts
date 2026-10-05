import { createHash } from 'node:crypto';

import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { UserRole } from '@domain/fivo/entities/user';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryUnitOfWork } from '@test/repositories/in-memory-unit-of-work';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { TokenConfirmacaoEmailInvalidoError } from '../errors/token-confirmacao-email-invalido.error';
import { UserAlreadyExistsError } from '../errors/users-already-exists.error';
import { ConfirmarTrocaEmailUseCase } from './confirmar-troca-email';

const TOKEN = 'token-de-confirmacao';
const AGORA = new Date('2026-09-20T12:00:00.000Z');
const HORA_MS = 60 * 60 * 1000;
const hashDe = (token: string) =>
  createHash('sha256').update(token).digest('hex');

describe('ConfirmarTrocaEmailUseCase', () => {
  let empresaRepository: InMemoryEmpresaRepository;
  let userRepository: InMemoryUserRepository;
  let sut: ConfirmarTrocaEmailUseCase;

  async function prepararTrocaPendente() {
    const user = UserFactory.create({
      role: UserRole.EMPRESA,
      email: 'antigo@empresa.test',
    });
    await userRepository.create(user);
    const empresa = EmpresaFactory.create({
      usuarioId: user.id,
      emailPendente: 'novo@empresa.test',
      tokenTrocaEmailHash: hashDe(TOKEN),
      tokenTrocaEmailExpiraEm: new Date(AGORA.getTime() + 24 * HORA_MS),
    });
    await empresaRepository.create(empresa);

    return { user, empresa };
  }

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    userRepository = new InMemoryUserRepository();
    sut = new ConfirmarTrocaEmailUseCase(
      empresaRepository,
      userRepository,
      new InMemoryUnitOfWork(),
    );
  });

  it('should switch the login e-mail to the pending one and clear the pending change on a valid token', async () => {
    const { user, empresa } = await prepararTrocaPendente();

    const response = await sut.execute({ token: TOKEN, agora: AGORA });

    expect(response.isRight()).toBe(true);
    const userAtualizado = await userRepository.findById(user.id.toString());
    expect(userAtualizado?.email).toBe('novo@empresa.test');
    const empresaAtualizada = await empresaRepository.findById(
      empresa.id.toString(),
    );
    expect(empresaAtualizada?.emailPendente).toBeNull();
    expect(empresaAtualizada?.tokenTrocaEmailHash).toBeNull();
  });

  it('should return TokenConfirmacaoEmailInvalidoError (400) for an unknown token and change nothing', async () => {
    const { user } = await prepararTrocaPendente();

    const response = await sut.execute({ token: 'outro-token', agora: AGORA });

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(TokenConfirmacaoEmailInvalidoError);
    expect((response.value as TokenConfirmacaoEmailInvalidoError).status).toBe(
      400,
    );
    expect((await userRepository.findById(user.id.toString()))?.email).toBe(
      'antigo@empresa.test',
    );
  });

  it('should reject a token that was already used', async () => {
    await prepararTrocaPendente();
    await sut.execute({ token: TOKEN, agora: AGORA });

    const segunda = await sut.execute({ token: TOKEN, agora: AGORA });

    expect(segunda.isLeft()).toBe(true);
    expect(segunda.value).toBeInstanceOf(TokenConfirmacaoEmailInvalidoError);
  });

  it('should return UserAlreadyExistsError (409) when the pending e-mail was taken meanwhile', async () => {
    const { user } = await prepararTrocaPendente();
    await userRepository.create(
      UserFactory.create({
        role: UserRole.EMPRESA,
        email: 'novo@empresa.test',
      }),
    );

    const response = await sut.execute({ token: TOKEN, agora: AGORA });

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(UserAlreadyExistsError);
    expect((await userRepository.findById(user.id.toString()))?.email).toBe(
      'antigo@empresa.test',
    );
  });

  it('should return TokenConfirmacaoEmailInvalidoError when the empresa has no linked user', async () => {
    const empresa = EmpresaFactory.create({
      usuarioId: new UniqueEntityId('sem-usuario'),
      emailPendente: 'novo@empresa.test',
      tokenTrocaEmailHash: hashDe(TOKEN),
    });
    await empresaRepository.create(empresa);

    const response = await sut.execute({ token: TOKEN, agora: AGORA });

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(TokenConfirmacaoEmailInvalidoError);
  });

  it('should confirm the change at 23h59 after the request', async () => {
    const { user } = await prepararTrocaPendente();

    const response = await sut.execute({
      token: TOKEN,
      agora: new Date(AGORA.getTime() + 23 * HORA_MS + 59 * 60 * 1000),
    });

    expect(response.isRight()).toBe(true);
    expect((await userRepository.findById(user.id.toString()))?.email).toBe(
      'novo@empresa.test',
    );
  });

  it('should reject the link at 24h01, keeping the previous e-mail and the pending change', async () => {
    const { user, empresa } = await prepararTrocaPendente();

    const response = await sut.execute({
      token: TOKEN,
      agora: new Date(AGORA.getTime() + 24 * HORA_MS + 60 * 1000),
    });

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(TokenConfirmacaoEmailInvalidoError);
    expect((response.value as TokenConfirmacaoEmailInvalidoError).message).toBe(
      'Link de confirmação inválido ou expirado',
    );
    expect((await userRepository.findById(user.id.toString()))?.email).toBe(
      'antigo@empresa.test',
    );
    const empresaDepois = await empresaRepository.findById(
      empresa.id.toString(),
    );
    expect(empresaDepois?.emailPendente).toBe('novo@empresa.test');
  });
});
