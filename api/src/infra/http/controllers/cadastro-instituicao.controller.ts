import {
  Body,
  CallHandler,
  Controller,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  PayloadTooLargeException,
  Post,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { catchError, Observable } from 'rxjs';

import { StorageIndisponivelError } from '@domain/fivo/application/errors/storage-indisponivel-error';
import { CriarInstituicaoUseCase } from '@domain/fivo/application/use-cases/criar-instituicao';
import { TipoArquivo } from '@domain/fivo/entities/arquivo';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { Public } from '@infra/auth/decorators/public.decorator';

import { criarInstituicaoSchema } from '../cadastro-instituicao.dto';
import type { CriarInstituicaoDto } from '../cadastro-instituicao.dto';
import { desembrulhar } from '../desembrulhar';
import { ApiErro } from '../openapi/decorators';
import { esquemaOpenApi } from '../openapi/esquema-openapi';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

interface ArquivoEnviado {
  originalname: string;
  buffer: Buffer;
}

interface ArquivosDoCadastro {
  logo?: ArquivoEnviado[];
  documento?: ArquivoEnviado[];
}

// Teto do multer = maior limite do domínio (documento, 10 MB). O logo tem
// limite menor (5 MB) e é barrado por `Arquivo.criar` com a mensagem dele.
// O busboy corta o arquivo ao *atingir* `fileSize`; o +1 mantém aceito o
// documento de exatamente 10 MB ("até 10 MB", INST-02 AC7).
const LIMITE_UPLOAD_BYTES = 10 * 1024 * 1024 + 1;

/**
 * O `DomainExceptionFilter` traduz o corte do multer com o limite do logo de
 * empresa (5 MB); nesta rota o teto é o do documento, então a mensagem
 * informa 10 MB (INST-02 AC8).
 */
@Injectable()
class LimiteDoDocumentoInterceptor implements NestInterceptor {
  intercept(
    _contexto: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      catchError((erro: unknown) => {
        if (erro instanceof PayloadTooLargeException) {
          throw new UnprocessableEntityException({
            statusCode: 422,
            message: 'Arquivo inválido: tamanho excede o limite de 10 MB.',
          });
        }

        throw erro;
      }),
    );
  }
}

const ARQUIVO_BINARIO = { type: 'string', format: 'binary' };

const CORPO_CRIAR_INSTITUICAO = esquemaOpenApi(
  'CriarInstituicao',
  criarInstituicaoSchema,
  {
    documento: {
      ...ARQUIVO_BINARIO,
      description: 'Obrigatório. PDF, JPG ou PNG de até 10 MB',
    },
    logo: {
      ...ARQUIVO_BINARIO,
      description: 'Opcional. PNG, JPG ou SVG de até 5 MB; raster ≥ 512×512',
    },
  },
);

@ApiTags('instituicoes')
@Controller('instituicoes')
export class CadastroInstituicaoController {
  private readonly logger = new Logger(CadastroInstituicaoController.name);

  constructor(
    private readonly criarInstituicao: CriarInstituicaoUseCase,
    private readonly arquivoService: ArquivoService,
  ) {}

  @ApiOperation({
    summary: 'Cadastra uma instituição (fica pendente de aprovação)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: CORPO_CRIAR_INSTITUICAO })
  @ApiResponse({
    status: 201,
    description: 'Instituição criada',
    schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  })
  @ApiErro(409, 'CNPJ ou e-mail já cadastrado')
  @ApiErro(
    422,
    'Dados inválidos, documento ausente, arquivo fora do formato ou do limite, ou causa inválida ou inativa',
  )
  @ApiErro(503, 'Armazenamento de arquivos indisponível')
  @Public()
  @Post()
  @UseInterceptors(
    LimiteDoDocumentoInterceptor,
    FileFieldsInterceptor(
      [
        { name: 'documento', maxCount: 1 },
        { name: 'logo', maxCount: 1 },
      ],
      { limits: { fileSize: LIMITE_UPLOAD_BYTES } },
    ),
  )
  async criar(
    @Body(new ZodValidationPipe(criarInstituicaoSchema))
    dados: CriarInstituicaoDto,
    @UploadedFiles() arquivos: ArquivosDoCadastro = {},
  ): Promise<{ id: string }> {
    const documento = arquivos.documento?.[0];
    const logo = arquivos.logo?.[0];
    let documentoArquivoId: string | undefined;
    let logoArquivoId: string | undefined;

    try {
      if (documento) {
        documentoArquivoId = await this.enviar(
          () => this.arquivoService.uploadDocumento(this.entrada(documento)),
          'Não foi possível enviar o documento, tente novamente',
        );
      }

      if (logo) {
        logoArquivoId = await this.enviar(
          () =>
            this.arquivoService.uploadImagem({
              tipo: TipoArquivo.LOGO_INSTITUICAO,
              ...this.entrada(logo),
            }),
          'Não foi possível enviar o logo, tente novamente',
        );
      }

      const { instituicaoId } = desembrulhar(
        await this.criarInstituicao.execute({
          ...dados,
          // Sem documento, o caso de uso devolve DocumentoObrigatorioError (422).
          documentoArquivoId: documentoArquivoId ?? '',
          logoArquivoId,
        }),
      );

      return { id: instituicaoId };
    } catch (erro) {
      // Cadastro não criado: nenhum arquivo enviado fica órfão.
      await this.descartar([documentoArquivoId, logoArquivoId]);

      throw erro;
    }
  }

  private entrada(arquivo: ArquivoEnviado) {
    return { nomeOriginal: arquivo.originalname, buffer: arquivo.buffer };
  }

  private async enviar(
    upload: () => ReturnType<ArquivoService['uploadDocumento']>,
    mensagemIndisponivel: string,
  ): Promise<string> {
    try {
      return desembrulhar(await upload()).id;
    } catch (erro) {
      if (erro instanceof StorageIndisponivelError) {
        throw new ServiceUnavailableException(mensagemIndisponivel);
      }

      throw erro;
    }
  }

  private async descartar(
    arquivoIds: Array<string | undefined>,
  ): Promise<void> {
    for (const arquivoId of arquivoIds.filter(Boolean) as string[]) {
      try {
        await this.arquivoService.remover(arquivoId);
      } catch (erro) {
        this.logger.warn(
          `Falha ao descartar o arquivo órfão ${arquivoId}: ${String(erro)}`,
        );
      }
    }
  }
}
