import { Controller, Get, NotFoundException, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { AssegurarEmpresaAprovadaUseCase } from '@domain/fivo/application/use-cases/assegurar-empresa-aprovada';
import { ListarBeneficiadasUseCase } from '@domain/fivo/application/use-cases/listar-beneficiadas';
import { UserRole } from '@domain/fivo/entities/user';
import { CurrentUser } from '@infra/auth/decorators/current-user.decorator';
import { Roles } from '@infra/auth/decorators/roles.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { beneficiadasQuerySchema } from '../beneficiadas.dto';
import type { BeneficiadasQueryDto } from '../beneficiadas.dto';
import { desembrulhar } from '../desembrulhar';
import { ApiErro, ApiProtegida } from '../openapi/decorators';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

const TEXTO_OU_NULO = { type: 'string', nullable: true };

@ApiTags('beneficiadas')
@Controller('beneficiadas')
export class BeneficiadasController {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly assegurarEmpresaAprovada: AssegurarEmpresaAprovadaUseCase,
    private readonly listarBeneficiadas: ListarBeneficiadasUseCase,
  ) {}

  @ApiOperation({
    summary:
      'Catálogo de beneficiadas: instituições aprovadas e causas ativas (empresa aprovada)',
  })
  @ApiQuery({
    name: 'busca',
    required: false,
    description:
      'Trecho do nome, sem distinção de acento ou caixa; filtra a partir de 2 caracteres',
  })
  @ApiResponse({
    status: 200,
    description:
      'Beneficiadas em ordem alfabética de nome; lista vazia quando nada está disponível',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'tipo',
          'id',
          'nome',
          'causa',
          'cidade',
          'uf',
          'descricao',
          'site',
          'logoArquivoId',
        ],
        properties: {
          tipo: { type: 'string', enum: ['INSTITUICAO', 'CAUSA'] },
          id: { type: 'string' },
          nome: { type: 'string' },
          causa: { ...TEXTO_OU_NULO, description: 'Causa da instituição' },
          cidade: TEXTO_OU_NULO,
          uf: TEXTO_OU_NULO,
          descricao: { type: 'string' },
          site: TEXTO_OU_NULO,
          logoArquivoId: TEXTO_OU_NULO,
        },
      },
    },
  })
  @ApiProtegida({ comPapel: true })
  @ApiErro(404, 'Empresa não encontrada')
  @Roles(UserRole.EMPRESA)
  @Get()
  async listar(
    @Query(new ZodValidationPipe(beneficiadasQuerySchema))
    { busca }: BeneficiadasQueryDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const empresa = await this.empresaRepository.findByUsuarioId(usuario.id);

    if (!empresa) {
      throw new NotFoundException('Empresa não encontrada');
    }

    // Empresa pendente, rejeitada ou suspensa não vê o catálogo (403).
    desembrulhar(
      await this.assegurarEmpresaAprovada.execute(empresa.id.toString()),
    );

    // O read model já exclui documento, e-mail, telefone, CNPJ e decisão (INST-10).
    return this.listarBeneficiadas.execute(busca);
  }
}
