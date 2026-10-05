import { createHash } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { Injectable } from '@nestjs/common';
import { TokenConfirmacaoEmailInvalidoError } from '../errors/token-confirmacao-email-invalido.error';
import { UserAlreadyExistsError } from '../errors/users-already-exists.error';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { UserRepository } from '../ports/database/user-repository';
import { UnitOfWork } from '../ports/unit-of-work';

interface ConfirmarTrocaEmailUseCaseRequest {
  token: string;
  agora: Date;
}

export type ConfirmarTrocaEmailUseCaseResponse = Either<
  TokenConfirmacaoEmailInvalidoError | UserAlreadyExistsError,
  void
>;

@Injectable()
export class ConfirmarTrocaEmailUseCase {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly userRepository: UserRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute({
    token,
    agora,
  }: ConfirmarTrocaEmailUseCaseRequest): Promise<ConfirmarTrocaEmailUseCaseResponse> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const empresa =
      await this.empresaRepository.findByTokenTrocaEmailHash(tokenHash);

    const expiraEm = empresa?.tokenTrocaEmailExpiraEm;

    if (
      !empresa ||
      !empresa.emailPendente ||
      !empresa.usuarioId ||
      !expiraEm ||
      expiraEm.getTime() <= agora.getTime()
    ) {
      return left(new TokenConfirmacaoEmailInvalidoError());
    }

    const user = await this.userRepository.findById(
      empresa.usuarioId.toString(),
    );

    if (!user) {
      return left(new TokenConfirmacaoEmailInvalidoError());
    }

    const donoDoNovoEmail = await this.userRepository.findByEmail(
      empresa.emailPendente,
    );

    if (donoDoNovoEmail && !donoDoNovoEmail.id.equals(user.id)) {
      return left(new UserAlreadyExistsError());
    }

    user.alterarEmail(empresa.emailPendente);
    empresa.limparTrocaDeEmail();

    await this.unitOfWork.executar(async () => {
      await this.userRepository.save(user);
      await this.empresaRepository.salvarTrocaDeEmail(empresa);
    });

    return right(undefined);
  }
}
