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
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { StorageIndisponivelError } from '@domain/fivo/application/errors/storage-indisponivel-error';
import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { ConfirmarTrocaEmailUseCase } from '@domain/fivo/application/use-cases/confirmar-troca-email';
import { CriarEmpresaUseCase } from '@domain/fivo/application/use-cases/criar-empresa';
import { EditarDadosEmpresaUseCase } from '@domain/fivo/application/use-cases/editar-dados-empresa';
import { TipoArquivo } from '@domain/fivo/entities/arquivo';
import { UserRole } from '@domain/fivo/entities/user';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { CurrentUser } from '@infra/auth/decorators/current-user.decorator';
import { Public } from '@infra/auth/decorators/public.decorator';
import { Roles } from '@infra/auth/decorators/roles.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { criarEmpresaSchema } from '../cadastro-empresa.dto';
import type { CriarEmpresaDto } from '../cadastro-empresa.dto';
import {
  confirmarEmailSchema,
  editarEmpresaSchema,
  trocarEmailSchema,
} from '../edicao-empresa.dto';
import type {
  ConfirmarEmailDto,
  EditarEmpresaDto,
  TrocarEmailDto,
} from '../edicao-empresa.dto';
import { desembrulhar } from '../desembrulhar';
import { empresaParaResposta } from '../empresa.presenter';
import { ApiErro, ApiProtegida } from '../openapi/decorators';
import { esquemaOpenApi } from '../openapi/esquema-openapi';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

interface LogoEnviado {
  originalname: string;
  buffer: Buffer;
}

// Mesmo limite de `Arquivo.criar` (5 MB); o multer corta o upload aqui e o
// `DomainExceptionFilter` devolve 422 com o limite (EMP-01 AC6).
const LIMITE_LOGO_BYTES = 5 * 1024 * 1024;

const LOGO_BINARIO = { type: 'string', format: 'binary' };

const CORPO_CRIAR_EMPRESA = esquemaOpenApi('CriarEmpresa', criarEmpresaSchema, {
  logo: LOGO_BINARIO,
});
const CORPO_EDITAR_EMPRESA = esquemaOpenApi(
  'EditarEmpresa',
  editarEmpresaSchema,
  { logo: LOGO_BINARIO },
);
const CORPO_TROCAR_EMAIL = esquemaOpenApi('TrocarEmail', trocarEmailSchema);
const CORPO_CONFIRMAR_EMAIL = esquemaOpenApi(
  'ConfirmarEmail',
  confirmarEmailSchema,
);

const RESPOSTA_EMPRESA = {
  type: 'object',
  required: [
    'id',
    'razaoSocial',
    'nomeFantasia',
    'cnpj',
    'email',
    'emailPendente',
    'telefone',
    'cep',
    'logradouro',
    'numero',
    'complemento',
    'bairro',
    'cidade',
    'uf',
    'site',
    'contato',
    'status',
    'logoArquivoId',
    'criadoEm',
  ],
  properties: {
    id: { type: 'string' },
    razaoSocial: { type: 'string' },
    nomeFantasia: { type: 'string' },
    cnpj: { type: 'string' },
    email: { type: 'string' },
    emailPendente: { type: 'string', nullable: true },
    telefone: { type: 'string' },
    cep: { type: 'string' },
    logradouro: { type: 'string' },
    numero: { type: 'string' },
    complemento: { type: 'string', nullable: true },
    bairro: { type: 'string' },
    cidade: { type: 'string' },
    uf: { type: 'string' },
    site: { type: 'string', nullable: true },
    contato: { type: 'string' },
    status: { type: 'string' },
    logoArquivoId: { type: 'string', nullable: true },
    criadoEm: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('empresas')
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

  @ApiOperation({
    summary: 'Cadastra uma empresa (fica pendente de aprovação)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: CORPO_CRIAR_EMPRESA })
  @ApiResponse({
    status: 201,
    description: 'Empresa criada',
    schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  })
  @ApiErro(409, 'CNPJ ou e-mail já cadastrado')
  @ApiErro(422, 'Dados inválidos')
  @ApiErro(503, 'Armazenamento de arquivos indisponível')
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

  @ApiOperation({ summary: 'Dados da empresa autenticada' })
  @ApiResponse({
    status: 200,
    description: 'Empresa',
    schema: RESPOSTA_EMPRESA,
  })
  @ApiProtegida({ comPapel: true })
  @ApiErro(404, 'Empresa não encontrada')
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

  @ApiOperation({ summary: 'Edita os dados cadastrais da empresa' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: CORPO_EDITAR_EMPRESA })
  @ApiResponse({
    status: 200,
    description: 'Empresa atualizada',
    schema: RESPOSTA_EMPRESA,
  })
  @ApiProtegida({ comPapel: true })
  @ApiErro(404, 'Empresa não encontrada')
  @ApiErro(422, 'Dados inválidos ou CNPJ imutável')
  @ApiErro(503, 'Armazenamento de arquivos indisponível')
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

  @ApiOperation({ summary: 'Solicita a troca do e-mail de acesso' })
  @ApiBody({ schema: CORPO_TROCAR_EMAIL })
  @ApiResponse({
    status: 202,
    description: 'Link de confirmação enviado ao novo e-mail',
  })
  @ApiProtegida({ comPapel: true })
  @ApiErro(404, 'Empresa não encontrada')
  @ApiErro(422, 'E-mail inválido')
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

  @ApiOperation({ summary: 'Confirma a troca de e-mail pelo token do link' })
  @ApiBody({ schema: CORPO_CONFIRMAR_EMAIL })
  @ApiResponse({ status: 204, description: 'E-mail trocado' })
  @ApiErro(400, 'Link de confirmação inválido ou expirado')
  @ApiErro(409, 'E-mail já cadastrado')
  @ApiErro(422, 'Token ausente')
  @Public()
  @Post('me/email/confirmacao')
  @HttpCode(204)
  async confirmarEmail(
    @Body(new ZodValidationPipe(confirmarEmailSchema))
    { token }: ConfirmarEmailDto,
  ): Promise<void> {
    desembrulhar(
      await this.confirmarTrocaEmail.execute({ token, agora: new Date() }),
    );
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
