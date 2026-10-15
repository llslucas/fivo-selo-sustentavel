import { Cnpj } from '@domain/fivo/entities/cnpj';
import { CausaStatus } from '@domain/fivo/entities/causa';
import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';
import { UserRole } from '@domain/fivo/entities/user';
import { FakeHasher } from '@test/cryptography/fake-hasher';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { CausaFactory } from '@test/factories/causa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { InMemoryUnitOfWork } from '@test/repositories/in-memory-unit-of-work';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { CausaIndisponivelError } from '../errors/causa-indisponivel.error';
import { DescricaoDocumentoInvalidaError } from '../errors/descricao-documento-invalida.error';
import { DocumentoObrigatorioError } from '../errors/documento-obrigatorio.error';
import { InstituicaoAlreadyExistsError } from '../errors/instituicao-already-exists.error';
import { InvalidCnpjError } from '../errors/invalid-cnpj.error';
import { SenhaFracaError } from '../errors/senha-fraca.error';
import { UserAlreadyExistsError } from '../errors/users-already-exists.error';
import { TemplateEmail } from '../ports/mailer';
import { CriarInstituicaoUseCase } from './criar-instituicao';

type CriarInstituicaoRequest = Parameters<
  CriarInstituicaoUseCase['execute']
>[0];

describe('CriarInstituicaoUseCase', () => {
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let userRepository: InMemoryUserRepository;
  let causaRepository: InMemoryCausaRepository;
  let unitOfWork: InMemoryUnitOfWork;
  let mailer: FakeMailer;
  let sut: CriarInstituicaoUseCase;
  let causaId: string;

  beforeEach(async () => {
    instituicaoRepository = new InMemoryInstituicaoRepository();
    userRepository = new InMemoryUserRepository();
    causaRepository = new InMemoryCausaRepository();
    unitOfWork = new InMemoryUnitOfWork();
    mailer = new FakeMailer();
    sut = new CriarInstituicaoUseCase(
      userRepository,
      instituicaoRepository,
      causaRepository,
      new FakeHasher(),
      mailer,
      unitOfWork,
    );

    const causa = CausaFactory.create({ nome: 'Meio Ambiente' });
    await causaRepository.create(causa);
    causaId = causa.id.toString();
  });

  function validRequest(
    overrides: Partial<CriarInstituicaoRequest> = {},
  ): CriarInstituicaoRequest {
    return {
      razaoSocial: 'Instituicao Teste LTDA',
      nomeFantasia: 'Instituicao Teste',
      cnpj: '12345678000195',
      email: 'contato@instituicaoteste.org.br',
      senha: 'SenhaForte123',
      telefone: '11999999999',
      cep: '12345678',
      logradouro: 'Rua Teste',
      numero: '123',
      complemento: 'Sala 2',
      bairro: 'Bairro Teste',
      cidade: 'Cidade Teste',
      uf: 'SP',
      site: 'https://www.instituicaoteste.org.br',
      contato: 'Maria da Silva',
      causaId,
      descricao: 'Recupera nascentes no interior paulista',
      documentoArquivoId: '22222222-2222-2222-2222-222222222222',
      descricaoDocumento: 'Estatuto social',
      ...overrides,
    };
  }

  function expectNadaPersistido() {
    expect(instituicaoRepository.items).toHaveLength(0);
    expect(userRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  }

  it('should create the User (INSTITUICAO) and the Instituicao (PENDENTE_APROVACAO) linked to each other on valid data', async () => {
    const response = await sut.execute(validRequest());

    expect(response.isRight()).toBe(true);
    if (!response.isRight()) return;

    const instituicao = await instituicaoRepository.findById(
      response.value.instituicaoId,
    );
    expect(instituicao?.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
    expect(instituicao?.razaoSocial).toBe('Instituicao Teste LTDA');
    expect(instituicao?.cnpj.valor).toBe('12345678000195');
    expect(instituicao?.causaId.toString()).toBe(causaId);
    expect(instituicao?.descricao).toBe(
      'Recupera nascentes no interior paulista',
    );
    expect(instituicao?.documento.arquivoId.toString()).toBe(
      '22222222-2222-2222-2222-222222222222',
    );
    expect(instituicao?.documento.descricao).toBe('Estatuto social');

    const user = await userRepository.findByEmail(
      'contato@instituicaoteste.org.br',
    );
    expect(user?.role).toBe(UserRole.INSTITUICAO);
    expect(instituicao?.usuarioId?.equals(user!.id)).toBe(true);
  });

  it('should persist only the hash of the senha, never the plain text', async () => {
    await sut.execute(validRequest());

    const user = await userRepository.findByEmail(
      'contato@instituicaoteste.org.br',
    );
    expect(user?.senha.valor).toBe('SenhaForte123-hashed');
    expect(user?.senha.valor).not.toBe('SenhaForte123');
  });

  it('should write the User and the Instituicao inside unitOfWork.executar', async () => {
    // Uma transação que não roda o job prova que nenhuma escrita acontece fora dela.
    const executarSpy = jest
      .spyOn(unitOfWork, 'executar')
      .mockResolvedValueOnce(undefined);

    await sut.execute(validRequest());

    expect(executarSpy).toHaveBeenCalledTimes(1);
    expect(instituicaoRepository.items).toHaveLength(0);
    expect(userRepository.items).toHaveLength(0);
  });

  it('should send the "cadastro em análise" e-mail to the registered address', async () => {
    await sut.execute(validRequest());

    expect(mailer.mensagens).toEqual([
      expect.objectContaining({
        para: 'contato@instituicaoteste.org.br',
        template: TemplateEmail.CADASTRO_RECEBIDO,
      }),
    ]);
  });

  it('should link the optional logoArquivoId to the created instituicao', async () => {
    const logoArquivoId = '11111111-1111-1111-1111-111111111111';

    const response = await sut.execute(validRequest({ logoArquivoId }));

    expect(response.isRight()).toBe(true);
    if (!response.isRight()) return;

    const instituicao = await instituicaoRepository.findById(
      response.value.instituicaoId,
    );
    expect(instituicao?.logoArquivoId?.toString()).toBe(logoArquivoId);
  });

  it('should reject with SenhaFracaError (422) and persist nothing when senha < 10 chars', async () => {
    const response = await sut.execute(validRequest({ senha: 'curta123' }));

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(SenhaFracaError);
      expect(response.value.status).toBe(422);
      expect(response.value.message).toBe(
        'A senha deve ter no mínimo 10 caracteres',
      );
    }
    expectNadaPersistido();
  });

  it('should reject with InvalidCnpjError (422) and persist nothing when the CNPJ fails the check digits', async () => {
    const response = await sut.execute(
      validRequest({ cnpj: '11111111111111' }),
    );

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(InvalidCnpjError);
      expect(response.value.status).toBe(422);
      expect(response.value.message).toBe('CNPJ inválido');
    }
    expectNadaPersistido();
  });

  it('should reject with DocumentoObrigatorioError (422) and persist nothing when the documento is missing', async () => {
    const response = await sut.execute(
      validRequest({ documentoArquivoId: '' }),
    );

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(DocumentoObrigatorioError);
      expect(response.value.status).toBe(422);
      expect(response.value.message).toBe(
        'Anexe um documento que comprove a existência da instituição',
      );
    }
    expectNadaPersistido();
  });

  it('should reject with DescricaoDocumentoInvalidaError (422) and persist nothing when the documento description exceeds 200 chars', async () => {
    const response = await sut.execute(
      validRequest({ descricaoDocumento: 'a'.repeat(201) }),
    );

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(DescricaoDocumentoInvalidaError);
      expect(response.value.status).toBe(422);
    }
    expectNadaPersistido();
  });

  it('should reject with CausaIndisponivelError (422) and persist nothing when the causa does not exist', async () => {
    const response = await sut.execute(
      validRequest({ causaId: 'causa-inexistente' }),
    );

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(CausaIndisponivelError);
      expect(response.value.status).toBe(422);
      expect(response.value.message).toBe('Causa inválida ou inativa');
    }
    expectNadaPersistido();
  });

  it('should reject with CausaIndisponivelError (422) and persist nothing when the causa is INATIVA', async () => {
    const inativa = CausaFactory.create({
      nome: 'Causa Encerrada',
      status: CausaStatus.INATIVA,
    });
    await causaRepository.create(inativa);

    const response = await sut.execute(
      validRequest({ causaId: inativa.id.toString() }),
    );

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(CausaIndisponivelError);
      expect(response.value.status).toBe(422);
      expect(response.value.message).toBe('Causa inválida ou inativa');
    }
    expectNadaPersistido();
  });

  it('should reject with InstituicaoAlreadyExistsError (409) when the CNPJ already belongs to another instituicao', async () => {
    const cnpjOrError = Cnpj.create('12345678000195');
    if (cnpjOrError.isLeft()) throw new Error('invalid cnpj fixture');

    await instituicaoRepository.create(
      InstituicaoFactory.create({ cnpj: cnpjOrError.value }),
    );

    const response = await sut.execute(validRequest());

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(InstituicaoAlreadyExistsError);
      expect(response.value.status).toBe(409);
      expect(response.value.message).toBe('CNPJ ou e-mail já cadastrado');
    }
    expect(instituicaoRepository.items).toHaveLength(1);
    expect(userRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });

  it('should reject with UserAlreadyExistsError (409) when the e-mail already belongs to any account of the platform', async () => {
    await userRepository.create(
      UserFactory.create({
        email: 'contato@instituicaoteste.org.br',
        role: UserRole.EMPRESA,
      }),
    );

    const response = await sut.execute(validRequest());

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(UserAlreadyExistsError);
      expect(response.value.status).toBe(409);
      expect(response.value.message).toBe('CNPJ ou e-mail já cadastrado');
    }
    expect(instituicaoRepository.items).toHaveLength(0);
    expect(userRepository.items).toHaveLength(1);
    expect(mailer.mensagens).toHaveLength(0);
  });

  it('should validate in the order senha → CNPJ → documento → causa → unicidade', async () => {
    await userRepository.create(
      UserFactory.create({ email: 'contato@instituicaoteste.org.br' }),
    );

    const tudoInvalido = {
      senha: 'curta123',
      cnpj: '11111111111111',
      documentoArquivoId: '',
      causaId: 'causa-inexistente',
    };

    const senha = await sut.execute(validRequest(tudoInvalido));
    expect(senha.value).toBeInstanceOf(SenhaFracaError);

    const cnpj = await sut.execute(
      validRequest({ ...tudoInvalido, senha: 'SenhaForte123' }),
    );
    expect(cnpj.value).toBeInstanceOf(InvalidCnpjError);

    const documento = await sut.execute(
      validRequest({
        ...tudoInvalido,
        senha: 'SenhaForte123',
        cnpj: '12345678000195',
      }),
    );
    expect(documento.value).toBeInstanceOf(DocumentoObrigatorioError);

    const causa = await sut.execute(
      validRequest({
        senha: 'SenhaForte123',
        cnpj: '12345678000195',
        causaId: 'causa-inexistente',
      }),
    );
    expect(causa.value).toBeInstanceOf(CausaIndisponivelError);

    const unicidade = await sut.execute(validRequest());
    expect(unicidade.value).toBeInstanceOf(UserAlreadyExistsError);
  });

  it('should still return right, keep the cadastro created and log the error when the Mailer fails', async () => {
    mailer.forceFailure();
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const response = await sut.execute(validRequest());

    expect(response.isRight()).toBe(true);
    if (!response.isRight()) return;

    const instituicao = await instituicaoRepository.findById(
      response.value.instituicaoId,
    );
    expect(instituicao?.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO);
    expect(userRepository.items).toHaveLength(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
