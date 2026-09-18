import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { CnpjImutavelError } from '../errors/cnpj-imutavel.error';
import { TemplateEmail } from '../ports/mailer';
import { EditarDadosEmpresaUseCase } from './editar-dados-empresa';

describe('EditarDadosEmpresaUseCase', () => {
  let empresaRepository: InMemoryEmpresaRepository;
  let mailer: FakeMailer;
  let sut: EditarDadosEmpresaUseCase;

  beforeEach(() => {
    empresaRepository = new InMemoryEmpresaRepository();
    mailer = new FakeMailer();
    sut = new EditarDadosEmpresaUseCase(empresaRepository, mailer);
  });

  it('should persist nomeFantasia/telefone/endereco/logoArquivoId changes', async () => {
    const empresa = EmpresaFactory.create();
    await empresaRepository.create(empresa);
    const logoArquivoId = '11111111-1111-1111-1111-111111111111';

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      nomeFantasia: 'Novo Nome Fantasia',
      telefone: '11888887777',
      cep: '87654321',
      logradouro: 'Rua Nova',
      numero: '456',
      bairro: 'Bairro Novo',
      cidade: 'Cidade Nova',
      uf: 'RJ',
      logoArquivoId,
    });

    expect(response.isRight()).toBe(true);

    const atualizada = await empresaRepository.findById(empresa.id.toString());
    expect(atualizada?.nomeFantasia).toBe('Novo Nome Fantasia');
    expect(atualizada?.telefone).toBe('11888887777');
    expect(atualizada?.cep).toBe('87654321');
    expect(atualizada?.logradouro).toBe('Rua Nova');
    expect(atualizada?.numero).toBe('456');
    expect(atualizada?.bairro).toBe('Bairro Novo');
    expect(atualizada?.cidade).toBe('Cidade Nova');
    expect(atualizada?.uf).toBe('RJ');
    expect(atualizada?.logoArquivoId?.toString()).toBe(logoArquivoId);
  });

  it('should keep fields not sent in the request unchanged', async () => {
    const empresa = EmpresaFactory.create({
      razaoSocial: 'Razão Original LTDA',
      contato: 'Contato Original',
    });
    await empresaRepository.create(empresa);

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      telefone: '11888887777',
    });

    expect(response.isRight()).toBe(true);

    const atualizada = await empresaRepository.findById(empresa.id.toString());
    expect(atualizada?.telefone).toBe('11888887777');
    expect(atualizada?.razaoSocial).toBe('Razão Original LTDA');
    expect(atualizada?.contato).toBe('Contato Original');
    expect(atualizada?.nomeFantasia).toBe(empresa.nomeFantasia);
  });

  it('should reject with CnpjImutavelError (422) with the exact message when trying to change the CNPJ', async () => {
    const empresa = EmpresaFactory.create();
    await empresaRepository.create(empresa);

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      cnpj: '11444777000161',
    });

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(CnpjImutavelError);
      if (response.value instanceof CnpjImutavelError) {
        expect(response.value.status).toBe(422);
        expect(response.value.message).toBe(
          'CNPJ não pode ser alterado; solicite ao suporte',
        );
      }
    }

    const inalterada = await empresaRepository.findById(empresa.id.toString());
    expect(inalterada?.cnpj.valor).toBe(empresa.cnpj.valor);
  });

  it('should not reject when the submitted CNPJ is the same value, just reformatted', async () => {
    const empresa = EmpresaFactory.create();
    await empresaRepository.create(empresa);
    const cnpjComMascara = '12.345.678/0001-95';

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      cnpj: cnpjComMascara,
      telefone: '11888887777',
    });

    expect(response.isRight()).toBe(true);
  });

  it('should set emailPendente, keep it separate from login and send EMAIL_CONFIRMACAO to the new address', async () => {
    const empresa = EmpresaFactory.create();
    await empresaRepository.create(empresa);

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      novoEmail: 'novo-email@example.com',
    });

    expect(response.isRight()).toBe(true);

    const atualizada = await empresaRepository.findById(empresa.id.toString());
    expect(atualizada?.emailPendente).toBe('novo-email@example.com');
    expect(atualizada?.tokenTrocaEmailHash).toBeTruthy();
    expect(atualizada?.tokenTrocaEmailHash).not.toBe('novo-email@example.com');

    expect(mailer.mensagens).toHaveLength(1);
    expect(mailer.mensagens[0]).toEqual(
      expect.objectContaining({
        para: 'novo-email@example.com',
        template: TemplateEmail.EMAIL_CONFIRMACAO,
      }),
    );
  });

  it('should reject with ResourceNotFoundError (404) when the empresa does not exist', async () => {
    const response = await sut.execute({
      empresaId: 'non-existent-id',
      telefone: '11888887777',
    });

    expect(response.isLeft()).toBe(true);
    if (response.isLeft()) {
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
    }
  });

  it('should not touch logoArquivoId when a new one is not sent', async () => {
    const logoOriginal = new UniqueEntityId();
    const empresa = EmpresaFactory.create({ logoArquivoId: logoOriginal });
    await empresaRepository.create(empresa);

    const response = await sut.execute({
      empresaId: empresa.id.toString(),
      telefone: '11888887777',
    });

    expect(response.isRight()).toBe(true);

    const atualizada = await empresaRepository.findById(empresa.id.toString());
    expect(atualizada?.logoArquivoId?.equals(logoOriginal)).toBe(true);
  });
});
