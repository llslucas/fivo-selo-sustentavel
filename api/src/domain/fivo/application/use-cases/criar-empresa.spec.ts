import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import { UserRole } from '@domain/fivo/entities/user';
import { FakeHasher } from '@test/cryptography/fake-hasher';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { InvalidCnpjError } from '../errors/invalid-cnpj.error';
import { SenhaFracaError } from '../errors/senha-fraca.error';
import { UserAlreadyExistsError } from '../errors/users-already-exists.error';
import { EmpresaAlreadyExistsError } from '../errors/empresa-already-exists.error';
import { TemplateEmail } from '../ports/mailer';
import { CriarEmpresaUseCase } from './criar-empresa';
import { Cnpj } from '@domain/fivo/entities/cnpj';

type CriarEmpresaRequest = Parameters<CriarEmpresaUseCase['execute']>[0];

function validRequest(
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
    complemento: 'Apto 101',
    bairro: 'Bairro Teste',
    cidade: 'Cidade Teste',
    uf: 'SP',
    site: 'https://www.empresateste.com.br',
    contato: 'João da Silva',
    ...overrides,
  };
}

describe('CriarEmpresaUseCase', () => {
  let empresaRepository: InMemoryEmpresaRepository;
  let userRepository: InMemoryUserRepository;
  let hasher: FakeHasher;
  let mailer: FakeMailer;
  let sut: CriarEmpresaUseCase;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    userRepository = new InMemoryUserRepository();
    hasher = new FakeHasher();
    mailer = new FakeMailer();
    sut = new CriarEmpresaUseCase(
      userRepository,
      empresaRepository,
      hasher,
      mailer,
    );
  });

  it('should create the User (EMPRESA) and the Empresa (PENDENTE_APROVACAO) with hashed password on valid data', async () => {
    const response = await sut.execute(validRequest());

    expect(response.isRight()).toBe(true);
    if (!response.isRight()) return;

    const { empresaId } = response.value;

    const empresa = await empresaRepository.findById(empresaId);
    expect(empresa).not.toBeNull();
    expect(empresa?.status).toBe(EmpresaStatus.PENDENTE_APROVACAO);
    expect(empresa?.razaoSocial).toBe('Empresa Teste LTDA');
    expect(empresa?.cnpj.valor).toBe('12345678000195');

    const user = await userRepository.findByEmail(
      'contato@empresateste.com.br',
    );
    expect(user).not.toBeNull();
    expect(user?.role).toBe(UserRole.EMPRESA);
    expect(user?.senha.valor).toBe('SenhaForte123-hashed');
    expect(empresa?.usuarioId?.equals(user!.id)).toBe(true);
  });

  it('should reject with SenhaFracaError (422) and persist/query nothing when senha < 10 chars', async () => {
    const findByCnpjSpy = jest.spyOn(empresaRepository, 'findByCnpj');
    const findByEmailSpy = jest.spyOn(userRepository, 'findByEmail');

    const response = await sut.execute(validRequest({ senha: 'curta123' }));

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(SenhaFracaError);
      expect(response.value.status).toBe(422);
    }
    expect(findByCnpjSpy).not.toHaveBeenCalled();
    expect(findByEmailSpy).not.toHaveBeenCalled();
    expect(empresaRepository.items).toHaveLength(0);
    expect(userRepository.items).toHaveLength(0);
  });

  it('should reject with InvalidCnpjError (422) and persist/query nothing when CNPJ is invalid', async () => {
    const findByCnpjSpy = jest.spyOn(empresaRepository, 'findByCnpj');
    const findByEmailSpy = jest.spyOn(userRepository, 'findByEmail');

    const response = await sut.execute(
      validRequest({ cnpj: '11111111111111' }),
    );

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(InvalidCnpjError);
      expect(response.value.status).toBe(422);
    }
    expect(findByCnpjSpy).not.toHaveBeenCalled();
    expect(findByEmailSpy).not.toHaveBeenCalled();
    expect(empresaRepository.items).toHaveLength(0);
    expect(userRepository.items).toHaveLength(0);
  });

  it('should reject with UserAlreadyExistsError (409) when the e-mail already belongs to another account', async () => {
    const otherUser = UserFactory.create({
      email: 'contato@empresateste.com.br',
    });
    await userRepository.create(otherUser);

    const response = await sut.execute(validRequest());

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(UserAlreadyExistsError);
      expect(response.value.status).toBe(409);
    }
    expect(empresaRepository.items).toHaveLength(0);
  });

  it('should reject with EmpresaAlreadyExistsError (409) when the CNPJ already belongs to a non-rejected empresa', async () => {
    const cnpjOrError = Cnpj.create('12345678000195');
    if (cnpjOrError.isLeft()) throw new Error('invalid cnpj fixture');

    const existingEmpresa = EmpresaFactory.create({
      cnpj: cnpjOrError.value,
      status: EmpresaStatus.APROVADA,
    });
    await empresaRepository.create(existingEmpresa);

    const response = await sut.execute(validRequest());

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(EmpresaAlreadyExistsError);
      expect(response.value.status).toBe(409);
    }
    expect(userRepository.items).toHaveLength(0);
  });

  it('should reuse the rejected empresa/user (same ids) and move it back to PENDENTE_APROVACAO when the only registro for the CNPJ is REJEITADA', async () => {
    const cnpjOrError = Cnpj.create('12345678000195');
    if (cnpjOrError.isLeft()) throw new Error('invalid cnpj fixture');

    const existingUser = UserFactory.create({
      email: 'contato@empresateste.com.br',
    });
    await userRepository.create(existingUser);

    const rejectedEmpresa = EmpresaFactory.create({
      cnpj: cnpjOrError.value,
      status: EmpresaStatus.REJEITADA,
      usuarioId: existingUser.id,
    });
    await empresaRepository.create(rejectedEmpresa);

    const response = await sut.execute(validRequest());

    expect(response.isRight()).toBe(true);
    if (!response.isRight()) return;

    expect(response.value.empresaId).toBe(rejectedEmpresa.id.toString());
    expect(empresaRepository.items).toHaveLength(1);
    expect(userRepository.items).toHaveLength(1);

    const empresa = await empresaRepository.findById(
      rejectedEmpresa.id.toString(),
    );
    expect(empresa?.status).toBe(EmpresaStatus.PENDENTE_APROVACAO);

    const user = await userRepository.findById(existingUser.id.toString());
    expect(user?.senha.valor).toBe('SenhaForte123-hashed');
  });

  it('should still return right, keep the cadastro created and log the error when the Mailer fails', async () => {
    mailer.forceFailure();
    const enviarSpy = jest.spyOn(mailer, 'enviar');
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const response = await sut.execute(validRequest());

    expect(response.isRight()).toBe(true);
    if (!response.isRight()) return;

    const empresa = await empresaRepository.findById(response.value.empresaId);
    expect(empresa?.status).toBe(EmpresaStatus.PENDENTE_APROVACAO);

    expect(enviarSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        para: 'contato@empresateste.com.br',
        template: TemplateEmail.CADASTRO_RECEBIDO,
      }),
    );
    expect(mailer.mensagens).toHaveLength(0);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should create the empresa when site is omitted (site is optional per AC1)', async () => {
    const requestWithoutSite = validRequest();
    delete requestWithoutSite.site;

    const response = await sut.execute(requestWithoutSite);

    expect(response.isRight()).toBe(true);
    if (!response.isRight()) return;

    const empresa = await empresaRepository.findById(response.value.empresaId);
    expect(empresa?.site).toBe('');
  });

  it('should link the given logoArquivoId to the created empresa', async () => {
    const arquivoId = '11111111-1111-1111-1111-111111111111';

    const response = await sut.execute(
      validRequest({ logoArquivoId: arquivoId }),
    );

    expect(response.isRight()).toBe(true);
    if (!response.isRight()) return;

    const empresa = await empresaRepository.findById(response.value.empresaId);
    expect(empresa?.logoArquivoId?.toString()).toBe(arquivoId);
  });
});
