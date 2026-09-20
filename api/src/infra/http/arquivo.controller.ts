import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  StreamableFile,
} from '@nestjs/common';

import { UserRole } from '@domain/fivo/entities/user';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { CurrentUser } from '@infra/auth/current-user.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

@Controller('arquivos')
export class ArquivoController {
  constructor(private readonly arquivoService: ArquivoService) {}

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

    const { buffer, mime } = await this.arquivoService.lerBytes(id);

    // SVG é baixado, nunca renderizado como documento; raster segue inline.
    return new StreamableFile(buffer, {
      type: mime,
      disposition: mime === 'image/svg+xml' ? 'attachment' : 'inline',
    });
  }
}
