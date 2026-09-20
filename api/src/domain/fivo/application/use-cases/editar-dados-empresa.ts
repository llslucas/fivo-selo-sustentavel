import { createHash, randomBytes } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Empresa } from '@domain/fivo/entities/empresa';
import { Injectable } from '@nestjs/common';
import { CnpjImutavelError } from '../errors/cnpj-imutavel.error';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { Mailer, TemplateEmail } from '../ports/mailer';

const TOKEN_BYTES = 32;

interface EditarDadosEmpresaUseCaseRequest {
  empresaId: string;
  cnpj?: string;
  nomeFantasia?: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  site?: string;
  contato?: string;
  logoArquivoId?: string;
  novoEmail?: string;
}

export type EditarDadosEmpresaUseCaseResponse = Either<
  ResourceNotFoundError | CnpjImutavelError,
  void
>;

@Injectable()
export class EditarDadosEmpresaUseCase {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly mailer: Mailer,
  ) {}

  async execute({
    empresaId,
    cnpj,
    nomeFantasia,
    telefone,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    site,
    contato,
    logoArquivoId,
    novoEmail,
  }: EditarDadosEmpresaUseCaseRequest): Promise<EditarDadosEmpresaUseCaseResponse> {
    const empresa = await this.empresaRepository.findById(empresaId);

    if (!empresa) {
      return left(new ResourceNotFoundError('Empresa não encontrada'));
    }

    if (cnpj !== undefined) {
      const cnpjSubmetidoDigitos = cnpj.replace(/\D/g, '');

      if (cnpjSubmetidoDigitos !== empresa.cnpj.valor) {
        return left(new CnpjImutavelError());
      }
    }

    const agora = new Date();
    let tokenBruto: string | undefined;

    const empresaAtualizada = Empresa.create(
      {
        razaoSocial: empresa.razaoSocial,
        nomeFantasia: nomeFantasia ?? empresa.nomeFantasia,
        cnpj: empresa.cnpj,
        telefone: telefone ?? empresa.telefone,
        cep: cep ?? empresa.cep,
        logradouro: logradouro ?? empresa.logradouro,
        numero: numero ?? empresa.numero,
        complemento: complemento ?? empresa.complemento,
        bairro: bairro ?? empresa.bairro,
        cidade: cidade ?? empresa.cidade,
        uf: uf ?? empresa.uf,
        site: site ?? empresa.site,
        contato: contato ?? empresa.contato,
        status: empresa.status,
        decididoPor: empresa.decididoPor,
        decididoEm: empresa.decididoEm,
        motivoDecisao: empresa.motivoDecisao,
        createdAt: empresa.createdAt,
        updatedAt: agora,
        usuarioId: empresa.usuarioId,
        logoArquivoId: logoArquivoId
          ? new UniqueEntityId(logoArquivoId)
          : empresa.logoArquivoId,
        emailPendente: empresa.emailPendente,
        tokenTrocaEmailHash: empresa.tokenTrocaEmailHash,
        tokenTrocaEmailExpiraEm: empresa.tokenTrocaEmailExpiraEm,
      },
      empresa.id,
    );

    if (novoEmail) {
      tokenBruto = randomBytes(TOKEN_BYTES).toString('hex');
      empresaAtualizada.solicitarTrocaDeEmail(
        novoEmail,
        createHash('sha256').update(tokenBruto).digest('hex'),
        agora,
      );
    }

    await this.empresaRepository.save(empresaAtualizada);

    if (novoEmail) {
      try {
        await this.mailer.enviar({
          para: novoEmail,
          template: TemplateEmail.EMAIL_CONFIRMACAO,
          dados: { token: tokenBruto },
        });
      } catch (error) {
        console.error(
          'Falha ao enviar e-mail de confirmação de troca de e-mail',
          error,
        );
      }
    }

    return right(undefined);
  }
}
