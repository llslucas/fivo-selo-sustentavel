import {
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { StorageIndisponivelError } from '@domain/fivo/application/errors/storage-indisponivel-error';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { CriarEmpresaUseCase } from '@domain/fivo/application/use-cases/criar-empresa';
import { TipoArquivo } from '@domain/fivo/entities/arquivo';
import { UserRole } from '@domain/fivo/entities/user';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { CurrentUser } from '@infra/auth/current-user.decorator';
import { Public } from '@infra/auth/public.decorator';
import { Roles } from '@infra/auth/roles.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { criarEmpresaSchema } from './cadastro-empresa.dto';
import type { CriarEmpresaDto } from './cadastro-empresa.dto';
import { desembrulhar } from './desembrulhar';
import { empresaParaResposta } from './empresa.presenter';
import { ZodValidationPipe } from './zod-validation.pipe';

interface LogoEnviado {
  originalname: string;
  buffer: Buffer;
}

// Teto de segurança do multer; o limite de negócio (5 MB) é do `Arquivo.criar`
// e responde 422 com a mensagem do limite.
const TETO_UPLOAD_BYTES = 10 * 1024 * 1024;

@Controller('empresas')
export class CadastroEmpresaController {
  private readonly logger = new Logger(CadastroEmpresaController.name);

  constructor(
    private readonly criarEmpresa: CriarEmpresaUseCase,
    private readonly arquivoService: ArquivoService,
    private readonly empresaRepository: EmpresaRepository,
    private readonly userRepository: UserRepository,
  ) {}

  @Public()
  @Post()
  @UseInterceptors(
    FileInterceptor('logo', { limits: { fileSize: TETO_UPLOAD_BYTES } }),
  )
  async criar(
    @Body(new ZodValidationPipe(criarEmpresaSchema)) dados: CriarEmpresaDto,
    @UploadedFile() logo?: LogoEnviado,
  ): Promise<{ id: string }> {
    const logoArquivoId = logo ? await this.enviarLogo(logo) : undefined;

    try {
      const { empresaId } = desembrulhar(
        await this.criarEmpresa.execute({ ...dados, logoArquivoId }),
      );

      return { id: empresaId };
    } catch (erro) {
      if (logoArquivoId) {
        await this.descartarLogo(logoArquivoId);
      }

      throw erro;
    }
  }

  @Roles(UserRole.EMPRESA)
  @Get('me')
  async obterMinha(@CurrentUser() usuario: UsuarioAutenticado) {
    const [empresa, user] = await Promise.all([
      this.empresaRepository.findByUsuarioId(usuario.id),
      this.userRepository.findById(usuario.id),
    ]);

    if (!empresa || !user) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return empresaParaResposta(empresa, user.email);
  }

  private async enviarLogo(logo: LogoEnviado): Promise<string> {
    try {
      const resultado = await this.arquivoService.uploadImagem({
        tipo: TipoArquivo.LOGO_EMPRESA,
        nomeOriginal: logo.originalname,
        buffer: logo.buffer,
      });

      return desembrulhar(resultado).id;
    } catch (erro) {
      if (erro instanceof StorageIndisponivelError) {
        throw new ServiceUnavailableException(
          'Não foi possível enviar o logo, tente novamente',
        );
      }

      throw erro;
    }
  }

  private async descartarLogo(arquivoId: string): Promise<void> {
    try {
      await this.arquivoService.remover(arquivoId);
    } catch (erro) {
      this.logger.warn(
        `Falha ao descartar o logo órfão ${arquivoId}: ${String(erro)}`,
      );
    }
  }
}
