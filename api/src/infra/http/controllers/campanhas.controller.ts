import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
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
import { UserRole } from '@domain/fivo/entities/user';
import { CurrentUser } from '@infra/auth/decorators/current-user.decorator';
import { Roles } from '@infra/auth/decorators/roles.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { criarCampanhaSchema } from '../campanhas.dto';
import type { CriarCampanhaDto } from '../campanhas.dto';
import { desembrulhar } from '../desembrulhar';
import { ApiErro, ApiProtegida } from '../openapi/decorators';
import { esquemaOpenApi } from '../openapi/esquema-openapi';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

const CORPO_CRIAR_CAMPANHA = esquemaOpenApi(
  'CriarCampanha',
  criarCampanhaSchema,
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
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly criarCampanha: CriarCampanhaUseCase,
    private readonly consultarCampanha: ConsultarCampanhaDaEmpresaUseCase,
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
