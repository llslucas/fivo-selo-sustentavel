import { randomUUID } from 'node:crypto';

import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import request from 'supertest';

import { CausaRepository } from '@domain/fivo/application/ports/database/causa-repository';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { InstituicaoRepository } from '@domain/fivo/application/ports/database/instituicao-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { Causa, CausaStatus } from '@domain/fivo/entities/causa';
import { DataCalendario } from '@domain/fivo/entities/data-calendario';
import { DocumentoValidacao } from '@domain/fivo/entities/documento-validacao';
import { Empresa, EmpresaStatus } from '@domain/fivo/entities/empresa';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';
import { User, UserRole } from '@domain/fivo/entities/user';
import { SessionService } from '@infra/auth/session.service';
import { CausaFactory } from '@test/factories/causa-factory';
import { cnpjValido } from '@test/factories/cnpj-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { UserFactory } from '@test/factories/user-factory';

import { AppDeTeste, comCookieDeSessao, servidorHttp } from './e2e-app';

/** "Hoje" em America/Sao_Paulo deslocado em `dias`, no formato AAAA-MM-DD. */
export function diaRelativo(dias: number): string {
  const hoje = DataCalendario.hojeEm(new Date()).toString();
  const data = new Date(`${hoje}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export const CINCO_MB = 5 * 1024 * 1024;

export function pngBuffer(largura = 100, altura = 100): Buffer {
  const png = new PNG({ width: largura, height: altura });
  png.data.fill(200);
  return PNG.sync.write(png);
}

/** PNG pequeno completado com zeros até `tamanho` bytes. */
export function pngComTamanho(tamanho: number): Buffer {
  const png = pngBuffer();
  return Buffer.concat([png, Buffer.alloc(tamanho - png.length)]);
}

export function jpegBuffer(largura = 100, altura = 80): Buffer {
  const dados = Buffer.alloc(largura * altura * 4, 120);
  return jpeg.encode({ data: dados, width: largura, height: altura }, 80).data;
}

export const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';

export interface EmpresaDeTeste {
  usuario: User;
  empresa: Empresa;
  token: string;
}

/**
 * Montagem de cenário dos e2e de campanha: usuários com sessão, empresas,
 * causas e instituições gravadas pelos repositórios reais, mais atalhos para
 * as rotas de campanha.
 */
export class CenarioCampanhas {
  private sequencia = 1;

  constructor(private readonly contexto: AppDeTeste) {}

  api() {
    return request(servidorHttp(this.contexto));
  }

  async criarUsuario(role: UserRole, email?: string): Promise<User> {
    const user = UserFactory.create({
      role,
      email: email ?? `usuario${this.sequencia++}@fivo.test`,
    });
    await this.contexto.app.get(UserRepository).create(user);
    return user;
  }

  async sessaoDe(user: User): Promise<string> {
    const { token } = await this.contexto.app
      .get(SessionService)
      .criar(user.id.toString());
    return token;
  }

  async sessaoComPapel(role: UserRole): Promise<string> {
    return this.sessaoDe(await this.criarUsuario(role));
  }

  async criarEmpresa(
    status: EmpresaStatus = EmpresaStatus.APROVADA,
    nomeFantasia = 'Café Bom',
  ): Promise<EmpresaDeTeste> {
    const usuario = await this.criarUsuario(UserRole.EMPRESA);
    const empresa = EmpresaFactory.create({
      usuarioId: usuario.id,
      cnpj: cnpjValido(this.sequencia++),
      nomeFantasia,
      status,
    });
    await this.contexto.app.get(EmpresaRepository).create(empresa);
    return { usuario, empresa, token: await this.sessaoDe(usuario) };
  }

  async criarCausa(
    nome = 'Educação',
    status: CausaStatus = CausaStatus.ATIVA,
  ): Promise<Causa> {
    const causa = CausaFactory.create({
      nome,
      descricao: `Descrição de ${nome}`,
      status,
    });
    await this.contexto.app.get(CausaRepository).create(causa);
    return causa;
  }

  async criarInstituicao(
    status: InstituicaoStatus = InstituicaoStatus.APROVADA,
    nomeFantasia = 'Amigos do Bairro',
  ): Promise<Instituicao> {
    const causa = await this.criarCausa(`Causa ${this.sequencia++}`);
    const documentoId = randomUUID();
    await this.contexto.prisma.arquivo.create({
      data: {
        id: documentoId,
        tipo: 'DOCUMENTO_INSTITUICAO',
        nomeOriginal: 'estatuto.pdf',
        mime: 'application/pdf',
        bytes: 2048,
        chaveStorage: `${documentoId}/estatuto.pdf`,
      },
    });
    const documento = DocumentoValidacao.criar(documentoId);
    if (documento.isLeft()) {
      throw documento.value;
    }

    const instituicao = InstituicaoFactory.create({
      nomeFantasia,
      cnpj: cnpjValido(this.sequencia++),
      causaId: causa.id,
      documento: documento.value,
      usuarioId: null,
      status,
    });
    await this.contexto.app.get(InstituicaoRepository).create(instituicao);
    return instituicao;
  }

  async alterarStatusDaEmpresa(
    empresa: Empresa,
    status: EmpresaStatus,
  ): Promise<void> {
    await this.contexto.prisma.empresa.update({
      where: { id: empresa.id.toString() },
      data: { status },
    });
  }

  async alterarStatusDaInstituicao(
    instituicao: Instituicao,
    status: InstituicaoStatus,
  ): Promise<void> {
    await this.contexto.prisma.instituicao.update({
      where: { id: instituicao.id.toString() },
      data: { status },
    });
  }

  /**
   * Põe a campanha num estado sem passar pelas rotas de submissão e decisão,
   * para testar uma rota da empresa isoladamente.
   */
  async forcarEstado(
    campanhaId: string,
    status: 'EM_ANALISE' | 'APROVADA' | 'REJEITADA',
    motivoUltimaRejeicao?: string,
  ): Promise<void> {
    const agora = new Date();
    await this.contexto.prisma.campanha.update({
      where: { id: campanhaId },
      data: {
        status,
        submetidaEm: agora,
        ...(status !== 'EM_ANALISE' && {
          decididoPor: randomUUID(),
          decididoEm: agora,
        }),
        ...(motivoUltimaRejeicao && { motivoUltimaRejeicao }),
      },
    });
  }

  /** `POST /campanhas`; devolve o `{ id, idPublico }` do 201. */
  async criarCampanha(
    token: string,
    corpo: Record<string, unknown>,
  ): Promise<{ id: string; idPublico: string }> {
    const resposta = await comCookieDeSessao(
      this.api().post('/campanhas').send(corpo),
      token,
    );
    if (resposta.status !== 201) {
      throw new Error(
        `criação falhou: ${resposta.status} ${JSON.stringify(resposta.body)}`,
      );
    }
    return resposta.body as { id: string; idPublico: string };
  }
}

/** Corpo de criação com tudo o que a submissão exige. */
export function corpoCompleto(
  instituicao: Instituicao,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    nome: 'Café que Educa',
    descricao: 'A cada pacote vendido, R$ 1,00 vai para o reforço escolar.',
    instituicaoId: instituicao.id.toString(),
    regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
    vigencia: { inicio: '2026-01-01' },
    ...extra,
  };
}
