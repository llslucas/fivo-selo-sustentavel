import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { CampanhaRepository } from '@domain/fivo/campanhas/ports/campanha-repository';
import { BuscarCampanhaPublicaUseCase } from '@domain/fivo/campanhas/use-cases/buscar-campanha-publica';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { Public } from '@infra/auth/decorators/public.decorator';

import { desembrulhar } from '../desembrulhar';
import { ApiErro } from '../openapi/decorators';

const PARAMETRO_ID_PUBLICO = {
  name: 'idPublico',
  description: 'Identificador público da campanha (o do selo e do QR Code)',
};

const NAO_PUBLICADA =
  'Campanha inexistente, não aprovada, de empresa não aprovada ou identificador malformado (mesmo corpo em todos os casos)';

const DECIMAL = { type: 'string', description: 'String decimal (`"1.50"`)' };

const CONTEUDO_BINARIO = { schema: { type: 'string', format: 'binary' } };

@ApiTags('campanhas')
@Controller('campanhas/publicas')
export class CampanhasPublicasController {
  constructor(
    private readonly buscarCampanhaPublica: BuscarCampanhaPublicaUseCase,
    private readonly campanhaRepository: CampanhaRepository,
    private readonly arquivoService: ArquivoService,
  ) {}

  @ApiOperation({
    summary:
      'Dados aprovados de uma campanha publicada, sem autenticação (sem id interno, motivo ou alteração pendente)',
  })
  @ApiParam(PARAMETRO_ID_PUBLICO)
  @ApiResponse({
    status: 200,
    description: 'Versão aprovada da campanha',
    schema: {
      type: 'object',
      required: [
        'nome',
        'descricao',
        'temCapa',
        'empresa',
        'beneficiada',
        'regraDoacao',
        'meta',
        'vigencia',
        'situacao',
      ],
      properties: {
        nome: { type: 'string' },
        descricao: { type: 'string', nullable: true },
        temCapa: {
          type: 'boolean',
          description:
            'Bytes em `GET /campanhas/publicas/{idPublico}/capa` quando `true`',
        },
        empresa: { type: 'string', description: 'Nome fantasia' },
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
        meta: { ...DECIMAL, nullable: true },
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
    },
  })
  @ApiErro(404, NAO_PUBLICADA)
  @Public()
  @Get(':idPublico')
  async buscar(@Param('idPublico') idPublico: string) {
    return desembrulhar(
      await this.buscarCampanhaPublica.execute({ idPublico }),
    );
  }

  @ApiOperation({
    summary: 'Imagem de capa de uma campanha publicada, sem autenticação',
  })
  @ApiParam(PARAMETRO_ID_PUBLICO)
  @ApiResponse({
    status: 200,
    description: 'Bytes da capa, com o Content-Type do arquivo',
    content: {
      'image/png': CONTEUDO_BINARIO,
      'image/jpeg': CONTEUDO_BINARIO,
    },
  })
  @ApiErro(404, `${NAO_PUBLICADA}, ou campanha sem capa`)
  @ApiErro(503, 'Storage indisponível no momento.')
  @Public()
  @Get(':idPublico/capa')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; sandbox")
  async capa(@Param('idPublico') idPublico: string): Promise<StreamableFile> {
    // O caso de uso decide a visibilidade; só a capa de campanha publicada
    // de empresa aprovada sai daqui (design §Risks, AD-016).
    const publica = desembrulhar(
      await this.buscarCampanhaPublica.execute({ idPublico }),
    );
    const campanha = publica.temCapa
      ? await this.campanhaRepository.findByIdPublico(idPublico)
      : null;
    const capaId = campanha?.capaArquivoId?.toString();
    const bytes = capaId ? await this.arquivoService.lerBytes(capaId) : null;

    if (!bytes) {
      throw new ResourceNotFoundError('Campanha não encontrada');
    }

    return new StreamableFile(bytes.buffer, {
      type: bytes.mime,
      disposition: 'inline',
    });
  }
}
