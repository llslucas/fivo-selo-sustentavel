import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Patch,
  Post,
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { StorageIndisponivelError } from '@domain/fivo/application/errors/storage-indisponivel-error';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { ConfirmarTrocaEmailUseCase } from '@domain/fivo/application/use-cases/confirmar-troca-email';
import { CriarEmpresaUseCase } from '@domain/fivo/application/use-cases/criar-empresa';
import { EditarDadosEmpresaUseCase } from '@domain/fivo/application/use-cases/editar-dados-empresa';
import { TipoArquivo } from '@domain/fivo/entities/arquivo';
import { UserRole } from '@domain/fivo/entities/user';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { CurrentUser } from '@infra/auth/current-user.decorator';
import { Public } from '@infra/auth/public.decorator';
import { Roles } from '@infra/auth/roles.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { criarEmpresaSchema } from './cadastro-empresa.dto';
import type { CriarEmpresaDto } from './cadastro-empresa.dto';
import {
  confirmarEmailSchema,
  editarEmpresaSchema,
  trocarEmailSchema,
} from './edicao-empresa.dto';
import type {
  ConfirmarEmailDto,
  EditarEmpresaDto,
  TrocarEmailDto,
} from './edicao-empresa.dto';
import { desembrulhar } from './desembrulhar';
import { empresaParaResposta } from './empresa.presenter';
import { ZodValidationPipe } from './zod-validation.pipe';

interface LogoEnviado {
  originalname: string;
  buffer: Buffer;
}

// Mesmo limite de `Arquivo.criar` (5 MB); o multer corta o upload aqui e o
// `DomainExceptionFilter` devolve 422 com o limite (EMP-01 AC6).
const LIMITE_LOGO_BYTES = 5 * 1024 * 1024;

@Controller('empresas')
export class CadastroEmpresaController {
  private readonly logger = new Logger(CadastroEmpresaController.name);

  constructor(
    private readonly criarEmpresa: CriarEmpresaUseCase,
    private readonly editarDados: EditarDadosEmpresaUseCase,
    private readonly confirmarTrocaEmail: ConfirmarTrocaEmailUseCase,
    private readonly arquivoService: ArquivoService,
    private readonly empresaRepository: EmpresaRepository,
    private readonly userRepository: UserRepository,
  ) {}

  @Public()
  @Post()
  @UseInterceptors(
    FileInterceptor('logo', { limits: { fileSize: LIMITE_LOGO_BYTES } }),
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

  @Roles(UserRole.EMPRESA)
  @Patch('me')
  @UseInterceptors(
    FileInterceptor('logo', { limits: { fileSize: LIMITE_LOGO_BYTES } }),
  )
  async editar(
    @Body(new ZodValidationPipe(editarEmpresaSchema)) dados: EditarEmpresaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
    @UploadedFile() logo?: LogoEnviado,
  ) {
    const empresaId = await this.idDaEmpresaDe(usuario);
    const logoArquivoId = logo ? await this.enviarLogo(logo) : undefined;

    try {
      desembrulhar(
        await this.editarDados.execute({ empresaId, ...dados, logoArquivoId }),
      );
    } catch (erro) {
      if (logoArquivoId) {
        await this.descartarLogo(logoArquivoId);
      }

      throw erro;
    }

    return this.obterMinha(usuario);
  }

  @Roles(UserRole.EMPRESA)
  @Patch('me/email')
  @HttpCode(202)
  async trocarEmail(
    @Body(new ZodValidationPipe(trocarEmailSchema))
    { novoEmail }: TrocarEmailDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    const empresaId = await this.idDaEmpresaDe(usuario);

    desembrulhar(await this.editarDados.execute({ empresaId, novoEmail }));
  }

  @Public()
  @Post('me/email/confirmacao')
  @HttpCode(204)
  async confirmarEmail(
    @Body(new ZodValidationPipe(confirmarEmailSchema))
    { token }: ConfirmarEmailDto,
  ): Promise<void> {
    desembrulhar(await this.confirmarTrocaEmail.execute({ token }));
  }

  private async idDaEmpresaDe(usuario: UsuarioAutenticado): Promise<string> {
    const empresa = await this.empresaRepository.findByUsuarioId(usuario.id);

    if (!empresa) {
      throw new NotFoundException('Empresa não encontrada');
    }

    return empresa.id.toString();
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
