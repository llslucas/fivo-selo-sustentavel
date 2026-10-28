import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  UnprocessableEntityException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Either } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { ConsultarCampanhaDaEmpresaUseCase } from '@domain/fivo/application/use-cases/consultar-campanha-da-empresa';
import { CriarCampanhaUseCase } from '@domain/fivo/application/use-cases/criar-campanha';
import { EditarCampanhaUseCase } from '@domain/fivo/application/use-cases/editar-campanha';
import { TipoArquivo } from '@domain/fivo/entities/arquivo';
import { UserRole } from '@domain/fivo/entities/user';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { CurrentUser } from '@infra/auth/decorators/current-user.decorator';
import { Roles } from '@infra/auth/decorators/roles.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { criarCampanhaSchema, editarCampanhaSchema } from '../campanhas.dto';
import type { CriarCampanhaDto, EditarCampanhaDto } from '../campanhas.dto';
import { desembrulhar } from '../desembrulhar';
import { ApiErro, ApiProtegida } from '../openapi/decorators';
import { esquemaOpenApi } from '../openapi/esquema-openapi';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

interface CapaEnviada {
  originalname: string;
  buffer: Buffer;
}

// O busboy corta o arquivo ao *atingir* `fileSize`; o +1 mantém aceita a capa
// de exatamente 5 MB, e o limite em si é do domínio (`Arquivo.criar`). Acima
// dele o `DomainExceptionFilter` responde 422 (Criação AC13).
const LIMITE_CAPA_BYTES = 5 * 1024 * 1024 + 1;

const CORPO_CAPA = {
  type: 'object',
  required: ['capa'],
  properties: {
    capa: {
      type: 'string',
      format: 'binary',
      description: 'PNG ou JPEG de até 5 MB, identificado pelo conteúdo',
    },
  },
};

const CORPO_CRIAR_CAMPANHA = esquemaOpenApi(
  'CriarCampanha',
  criarCampanhaSchema,
);

const CORPO_EDITAR_CAMPANHA = esquemaOpenApi(
  'EditarCampanha',
  editarCampanhaSchema,
);

const PARAMETRO_ID = { name: 'id', description: 'Id interno da campanha' };

const TEXTO_OU_NULO = { type: 'string', nullable: true };

const BENEFICIADA = {
  type: 'object',
  required: ['tipo', 'id'],
  properties: {
    tipo: { type: 'string', enum: ['INSTITUICAO', 'CAUSA'] },
    id: { type: 'string' },
  },
};

const REGRA_DOACAO = {
  type: 'object',
  required: ['tipo'],
  properties: {
    tipo: { type: 'string', enum: ['POR_UNIDADE', 'PERCENTUAL'] },
    valor: {
      type: 'string',
      description: 'R$ por unidade em string decimal (`"1.50"`)',
    },
    percentual: {
      type: 'string',
      description: 'Percentual sobre o preço em string decimal (`"12.50"`)',
    },
  },
};

const VIGENCIA = {
  type: 'object',
  required: ['inicio'],
  properties: {
    inicio: { type: 'string', format: 'date' },
    fim: { type: 'string', format: 'date' },
  },
};

const RESPOSTA_CAMPANHA = {
  type: 'object',
  required: [
    'id',
    'idPublico',
    'nome',
    'descricao',
    'capaArquivoId',
    'beneficiada',
    'regraDoacao',
    'meta',
    'vigencia',
    'status',
    'submetidaEm',
    'motivoUltimaRejeicao',
    'alteracaoPendente',
    'criadaEm',
    'atualizadaEm',
  ],
  properties: {
    id: { type: 'string' },
    idPublico: { type: 'string' },
    nome: { type: 'string' },
    descricao: TEXTO_OU_NULO,
    capaArquivoId: {
      ...TEXTO_OU_NULO,
      description: 'Bytes em `GET /arquivos/{capaArquivoId}`',
    },
    beneficiada: { ...BENEFICIADA, nullable: true },
    regraDoacao: { ...REGRA_DOACAO, nullable: true },
    meta: { ...TEXTO_OU_NULO, description: 'R$ em string decimal' },
    vigencia: { ...VIGENCIA, nullable: true },
    status: {
      type: 'string',
      enum: ['RASCUNHO', 'EM_ANALISE', 'APROVADA', 'REJEITADA'],
    },
    submetidaEm: { type: 'string', format: 'date-time', nullable: true },
    motivoUltimaRejeicao: TEXTO_OU_NULO,
    alteracaoPendente: {
      type: 'object',
      nullable: true,
      description:
        'Compromisso proposto em análise; os valores aprovados seguem nos campos acima',
      required: ['beneficiada', 'regraDoacao', 'vigencia', 'abertaEm'],
      properties: {
        beneficiada: BENEFICIADA,
        regraDoacao: REGRA_DOACAO,
        vigencia: VIGENCIA,
        abertaEm: { type: 'string', format: 'date-time' },
      },
    },
    criadaEm: { type: 'string', format: 'date-time' },
    atualizadaEm: { type: 'string', format: 'date-time', nullable: true },
  },
};

@ApiTags('campanhas')
@ApiProtegida({ comPapel: true })
@Roles(UserRole.EMPRESA)
@Controller('campanhas')
export class CampanhasController {
  private readonly logger = new Logger(CampanhasController.name);

  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly criarCampanha: CriarCampanhaUseCase,
    private readonly consultarCampanha: ConsultarCampanhaDaEmpresaUseCase,
    private readonly editarCampanha: EditarCampanhaUseCase,
    private readonly arquivoService: ArquivoService,
  ) {}

  @ApiOperation({ summary: 'Cria uma campanha em rascunho (empresa aprovada)' })
  @ApiBody({ schema: CORPO_CRIAR_CAMPANHA })
  @ApiResponse({
    status: 201,
    description: 'Campanha criada em RASCUNHO',
    schema: {
      type: 'object',
      required: ['id', 'idPublico'],
      properties: {
        id: { type: 'string' },
        idPublico: {
          type: 'string',
          description: 'Identificador público imutável e não sequencial',
        },
      },
    },
  })
  @ApiErro(404, 'Empresa não encontrada')
  @ApiErro(
    422,
    'Nome, descrição, regra, meta ou datas inválidos, ou beneficiada ambígua ou indisponível',
  )
  @Post()
  async criar(
    @Body(new ZodValidationPipe(criarCampanhaSchema)) dados: CriarCampanhaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<{ id: string; idPublico: string }> {
    const empresaId = await this.idDaEmpresaDe(usuario);

    return this.executar(
      await this.criarCampanha.execute({ empresaId, ...dados }),
    );
  }

  @ApiOperation({
    summary:
      'Detalhe de uma campanha da empresa, com motivo da última rejeição e alteração pendente',
  })
  @ApiParam(PARAMETRO_ID)
  @ApiResponse({
    status: 200,
    description: 'Campanha da empresa',
    schema: RESPOSTA_CAMPANHA,
  })
  @ApiErro(404, 'Campanha não encontrada (inclusive de outra empresa)')
  @Get(':id')
  async detalhar(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const empresaId = await this.idDaEmpresaDe(usuario);

    return this.executar(
      await this.consultarCampanha.execute({ empresaId, campanhaId: id }),
    );
  }

  @ApiOperation({
    summary:
      'Edita a campanha: em RASCUNHO ou REJEITADA aplica tudo; em APROVADA aplica nome, descrição e meta na hora e abre uma alteração em análise para beneficiada, regra ou vigência',
  })
  @ApiParam(PARAMETRO_ID)
  @ApiBody({ schema: CORPO_EDITAR_CAMPANHA })
  @ApiResponse({
    status: 200,
    description: 'Campanha depois da edição',
    schema: RESPOSTA_CAMPANHA,
  })
  @ApiErro(404, 'Campanha não encontrada (inclusive de outra empresa)')
  @ApiErro(
    409,
    'Campanha em análise, alteração já em análise ou edição concorrente',
  )
  @ApiErro(
    422,
    'Nome, descrição, regra, meta ou datas inválidos, beneficiada ambígua ou indisponível, ou data de fim vencida na alteração',
  )
  @Patch(':id')
  async editar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(editarCampanhaSchema)) dados: EditarCampanhaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const empresaId = await this.idDaEmpresaDe(usuario);

    return this.executar(
      await this.editarCampanha.execute({
        empresaId,
        usuarioId: usuario.id,
        campanhaId: id,
        ...dados,
      }),
    );
  }

  @ApiOperation({
    summary:
      'Envia ou troca a imagem de capa (aplicada na hora, inclusive em campanha aprovada)',
  })
  @ApiParam(PARAMETRO_ID)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: CORPO_CAPA })
  @ApiResponse({ status: 204, description: 'Capa gravada' })
  @ApiErro(404, 'Campanha não encontrada (inclusive de outra empresa)')
  @ApiErro(409, 'Campanha em análise ou edição concorrente')
  @ApiErro(422, 'Capa ausente, fora de PNG/JPEG ou acima de 5 MB')
  @ApiErro(503, 'Storage indisponível no momento.')
  @Put(':id/capa')
  @HttpCode(204)
  @UseInterceptors(
    FileInterceptor('capa', { limits: { fileSize: LIMITE_CAPA_BYTES } }),
  )
  async trocarCapa(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
    @UploadedFile() capa?: CapaEnviada,
  ): Promise<void> {
    const empresaId = await this.idDaEmpresaDe(usuario);
    const { capaArquivoId: capaAnterior } = this.executar(
      await this.consultarCampanha.execute({ empresaId, campanhaId: id }),
    );

    if (!capa) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        message: 'Campo obrigatório',
        errors: [{ campo: 'capa', mensagem: 'Campo obrigatório' }],
      });
    }

    // Storage fora do ar sobe `StorageIndisponivelError` (503) antes de
    // qualquer gravação: a campanha fica como estava (Criação AC14).
    const { id: novaCapa } = desembrulhar(
      await this.arquivoService.uploadImagem({
        tipo: TipoArquivo.IMAGEM_CAMPANHA,
        nomeOriginal: capa.originalname,
        buffer: capa.buffer,
      }),
    );

    try {
      this.executar(
        await this.editarCampanha.execute({
          empresaId,
          usuarioId: usuario.id,
          campanhaId: id,
          capaArquivoId: novaCapa,
        }),
      );
    } catch (erro) {
      // A campanha não aceitou a capa nova: ela não pode ficar órfã.
      await this.descartar(novaCapa);
      throw erro;
    }

    // Só depois do `salvar`, quando nada mais referencia a capa anterior.
    if (capaAnterior) {
      await this.descartar(capaAnterior);
    }
  }

  private async descartar(arquivoId: string): Promise<void> {
    try {
      await this.arquivoService.remover(arquivoId);
    } catch (erro) {
      this.logger.warn(
        `Falha ao descartar a capa órfã ${arquivoId}: ${String(erro)}`,
      );
    }
  }

  private async idDaEmpresaDe(usuario: UsuarioAutenticado): Promise<string> {
    const empresa = await this.empresaRepository.findByUsuarioId(usuario.id);

    if (!empresa) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return empresa.id.toString();
  }

  /**
   * O `DomainExceptionFilter` responde todo `NotAllowedError` com "Acesso
   * negado". Aqui ele só vem do portão de empresa aprovada, cuja mensagem é
   * a da spec (Criação AC1: "Cadastro ainda não aprovado").
   */
  private executar<V>(resultado: Either<Error, V>): V {
    if (resultado.isLeft() && resultado.value instanceof NotAllowedError) {
      throw new ForbiddenException({
        statusCode: 403,
        message: resultado.value.message,
      });
    }

    return desembrulhar(resultado);
  }
}
