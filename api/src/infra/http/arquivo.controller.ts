import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { UserRole } from '@domain/fivo/entities/user';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { CurrentUser } from '@infra/auth/current-user.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { ApiErro, ApiProtegida } from './openapi/decorators';

const CABECALHOS_ARQUIVO = {
  'X-Content-Type-Options': {
    description: 'Sempre `nosniff`',
    schema: { type: 'string' },
  },
  'Content-Security-Policy': {
    description: "Sempre `default-src 'none'; sandbox`",
    schema: { type: 'string' },
  },
  'Content-Disposition': {
    description: '`attachment` para SVG; `inline` para os demais tipos',
    schema: { type: 'string' },
  },
};

const CONTEUDO_BINARIO = { schema: { type: 'string', format: 'binary' } };

@ApiTags('arquivos')
@Controller('arquivos')
export class ArquivoController {
  constructor(private readonly arquivoService: ArquivoService) {}

  @ApiOperation({
    summary: 'Baixa um arquivo (dono do arquivo ou ADMIN)',
  })
  @ApiParam({ name: 'id', description: 'Id do arquivo' })
  @ApiResponse({
    status: 200,
    description: 'Bytes do arquivo, com o Content-Type do registro',
    headers: CABECALHOS_ARQUIVO,
    content: {
      'image/png': CONTEUDO_BINARIO,
      'image/jpeg': CONTEUDO_BINARIO,
      'image/svg+xml': CONTEUDO_BINARIO,
      'application/pdf': CONTEUDO_BINARIO,
    },
  })
  @ApiProtegida({ comPapel: true })
  @ApiErro(404, 'Arquivo não encontrado')
  @Get(':id')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; sandbox")
  async baixar(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<StreamableFile> {
    const acesso = await this.arquivoService.buscarAcesso(id);

    if (!acesso) {
      throw new NotFoundException('Arquivo não encontrado');
    }

    if (
      usuario.role !== UserRole.ADMIN &&
      acesso.donoUsuarioId !== usuario.id
    ) {
      throw new ForbiddenException('Acesso negado');
    }

    const bytes = await this.arquivoService.lerBytes(id);

    if (!bytes) {
      throw new NotFoundException('Arquivo não encontrado');
    }

    const { buffer, mime } = bytes;

    // SVG é baixado, nunca renderizado como documento; raster segue inline.
    return new StreamableFile(buffer, {
      type: mime,
      disposition: mime === 'image/svg+xml' ? 'attachment' : 'inline',
    });
  }
}
