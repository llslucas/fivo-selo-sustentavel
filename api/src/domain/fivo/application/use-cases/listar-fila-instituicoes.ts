import { InstituicaoStatus } from '@domain/fivo/entities/instituicao';
import { Injectable } from '@nestjs/common';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { UserRepository } from '../ports/database/user-repository';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { CausaRepository } from '../ports/database/causa-repository';

export interface ItemFilaInstituicoes {
  id: string;
  razaoSocial: string;
  cnpj: string;
  causa: string;
  cidade: string;
  uf: string;
  email: string;
  documentoArquivoId: string;
  cnpjCoincideComEmpresa: boolean;
  createdAt: Date;
}

export type ListarFilaInstituicoesUseCaseRequest = { user: User };
export type ListarFilaInstituicoesUseCaseResponse = Either<
  NotAllowedError,
  ItemFilaInstituicoes[]
>;

@Injectable()
export class ListarFilaInstituicoesUseCase {
  constructor(
    private readonly instituicaoRepository: InstituicaoRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly userRepository: UserRepository,
    private readonly causaRepository: CausaRepository,
  ) {}

  async execute({
    user,
  }: ListarFilaInstituicoesUseCaseRequest): Promise<ListarFilaInstituicoesUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const instituicoes = await this.instituicaoRepository.listarPorEstado(
      InstituicaoStatus.PENDENTE_APROVACAO,
      'asc',
    );

    return right(
      await Promise.all(
        instituicoes.map(async (instituicao) => {
          const instituicaoUser = instituicao.usuarioId
            ? await this.userRepository.findById(
                instituicao.usuarioId.toString(),
              )
            : null;

          const empresaExistente = await this.empresaRepository.findByCnpj(
            instituicao.cnpj.valor,
          );

          const causa = await this.causaRepository.findById(
            instituicao.causaId.toString(),
          );

          return {
            id: instituicao.id.toString(),
            razaoSocial: instituicao.razaoSocial,
            cnpj: instituicao.cnpj.valor,
            causa: causa?.nome ?? '',
            cidade: instituicao.cidade,
            uf: instituicao.uf,
            email: instituicaoUser?.email ?? '',
            documentoArquivoId: instituicao.documento.arquivoId.toString(),
            cnpjCoincideComEmpresa: empresaExistente !== null,
            createdAt: instituicao.createdAt,
          };
        }),
      ),
    );
  }
}
