import {
  Controller,
  Get,
  Header,
  HttpException,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { BuscarEmpresaPublicaUseCase } from '@domain/fivo/campanhas/use-cases/buscar-empresa-publica';
import { EmpresaRepository } from '@domain/fivo/empresas/ports/empresa-repository';
import { ListarParceirosUseCase } from '@domain/fivo/empresas/use-cases/listar-parceiros';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { Public } from '@infra/auth/decorators/public.decorator';

import { desembrulhar } from '../desembrulhar';
import { ApiErro } from '../openapi/decorators';

const PARAMETRO_SLUG = {
  name: 'slug',
  description: 'Slug permanente da empresa, atribuído na primeira aprovação',
};

const NAO_PUBLICADA =
  'Empresa não encontrada: slug inexistente ou empresa fora de APROVADA (mesmo corpo nos dois casos)';

// Mesmo corpo em todo 404 público: não revela se a empresa existe, está
// suspensa ou só não tem logo.
const NAO_ENCONTRADA = { statusCode: 404, message: 'Empresa não encontrada' };

const CONTEUDO_BINARIO = { schema: { type: 'string', format: 'binary' } };

const DECIMAL = { type: 'string', description: 'String decimal (`"1.50"`)' };

const CAMPANHA_PUBLICA = {
  type: 'object',
  required: [
    'slug',
    'nome',
    'descricao',
    'beneficiada',
    'regraDoacao',
    'vigencia',
    'situacao',
  ],
  properties: {
    slug: { type: 'string' },
    nome: { type: 'string' },
    descricao: { type: 'string', nullable: true },
    beneficiada: {
      type: 'object',
      required: ['tipo', 'nome'],
      properties: {
        tipo: { type: 'string', enum: ['INSTITUICAO', 'CAUSA'] },
        nome: { type: 'string' },
      },
    },
    regraDoacao: {
      type: 'object',
      required: ['tipo'],
      properties: {
        tipo: { type: 'string', enum: ['POR_UNIDADE', 'PERCENTUAL'] },
        valor: DECIMAL,
        percentual: DECIMAL,
      },
    },
    vigencia: {
      type: 'object',
      required: ['inicio'],
      properties: {
        inicio: { type: 'string', format: 'date' },
        fim: { type: 'string', format: 'date' },
      },
    },
    situacao: { type: 'string', enum: ['NAO_INICIADA', 'EM_ANDAMENTO'] },
  },
};

const EMPRESA_PUBLICA = {
  type: 'object',
  required: [
    'slug',
    'nomeFantasia',
    'cidade',
    'uf',
    'site',
    'temLogo',
    'campanhas',
  ],
  properties: {
    slug: { type: 'string' },
    nomeFantasia: { type: 'string' },
    cidade: { type: 'string' },
    uf: { type: 'string' },
    site: { type: 'string' },
    temLogo: {
      type: 'boolean',
      description:
        'Bytes em `GET /empresas/publicas/{slug}/logo` quando `true`',
    },
    campanhas: {
      type: 'array',
      description: 'Só APROVADA, da aprovação mais recente para a mais antiga',
      items: CAMPANHA_PUBLICA,
    },
  },
};

const PARCEIRO = {
  type: 'object',
  required: ['slug', 'nomeFantasia', 'cidade', 'uf', 'temLogo'],
  properties: {
    slug: { type: 'string' },
    nomeFantasia: { type: 'string' },
    cidade: { type: 'string' },
    uf: { type: 'string' },
    temLogo: {
      type: 'boolean',
      description:
        'Bytes em `GET /empresas/publicas/{slug}/logo` quando `true`',
    },
  },
};

@ApiTags('empresas')
@Controller('empresas/publicas')
export class EmpresasPublicasController {
  constructor(
    private readonly listarParceiros: ListarParceirosUseCase,
    private readonly buscarEmpresaPublica: BuscarEmpresaPublicaUseCase,
    private readonly empresaRepository: EmpresaRepository,
    private readonly arquivoService: ArquivoService,
  ) {}

  @ApiOperation({
    summary:
      'Vitrine de parceiros: empresas aprovadas em ordem alfabética, sem autenticação',
  })
  @ApiResponse({
    status: 200,
    description:
      '`nomeFantasia` em ordem alfabética, sem diferenciar caixa nem acento',
    schema: { type: 'array', items: PARCEIRO },
  })
  @Public()
  @Get()
  async listar() {
    const parceiros = await this.listarParceiros.execute();

    return parceiros.map(({ slug, nomeFantasia, cidade, uf, temLogo }) => ({
      slug,
      nomeFantasia,
      cidade,
      uf,
      temLogo,
    }));
  }

  @ApiOperation({
    summary:
      'Página pública da empresa aprovada com as campanhas aprovadas, sem autenticação',
  })
  @ApiParam(PARAMETRO_SLUG)
  @ApiResponse({
    status: 200,
    description: 'Dados públicos da empresa (sem CNPJ, contato ou endereço)',
    schema: EMPRESA_PUBLICA,
  })
  @ApiErro(404, NAO_PUBLICADA)
  @Public()
  @Get(':slug')
  async buscar(@Param('slug') slug: string) {
    const resultado = await this.buscarEmpresaPublica.execute({ slug });

    // O filtro troca toda `ResourceNotFoundError` pela mensagem genérica; a
    // spec fixa "Empresa não encontrada" (Página pública AC3).
    if (
      resultado.isLeft() &&
      resultado.value instanceof ResourceNotFoundError
    ) {
      throw new HttpException(NAO_ENCONTRADA, 404);
    }

    return desembrulhar(resultado);
  }

  @ApiOperation({
    summary: 'Logo de uma empresa aprovada, sem autenticação',
  })
  @ApiParam(PARAMETRO_SLUG)
  @ApiResponse({
    status: 200,
    description: 'Bytes do logo, com o Content-Type do arquivo',
    content: {
      'image/png': CONTEUDO_BINARIO,
      'image/jpeg': CONTEUDO_BINARIO,
    },
  })
  @ApiErro(404, `${NAO_PUBLICADA}, ou empresa sem logo`)
  @ApiErro(503, 'Storage indisponível no momento.')
  @Public()
  @Get(':slug/logo')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; sandbox")
  async logo(@Param('slug') slug: string): Promise<StreamableFile> {
    // Só o logo de empresa APROVADA é público (mesma regra da página).
    const empresa = await this.empresaRepository.findBySlug(slug);
    const logoId = empresa?.estaAprovada()
      ? empresa.logoArquivoId?.toString()
      : undefined;
    const bytes = logoId ? await this.arquivoService.lerBytes(logoId) : null;

    if (!bytes) {
      throw new HttpException(NAO_ENCONTRADA, 404);
    }

    return new StreamableFile(bytes.buffer, {
      type: bytes.mime,
      disposition: 'inline',
    });
  }
}
