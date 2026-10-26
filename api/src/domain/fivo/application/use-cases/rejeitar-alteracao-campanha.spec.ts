import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { AlteracaoStatus } from '@domain/fivo/entities/alteracao-compromisso';
import { Campanha, CampanhaStatus } from '@domain/fivo/entities/campanha';
import { UserRole } from '@domain/fivo/entities/user';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryCampanhaRepository } from '@test/repositories/in-memory-campanha-repository';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryUserRepository } from '@test/repositories/in-memory-user-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { FakeMailer } from '@test/cryptography/fake-mailer';
import { MotivoInsuficienteError } from '../errors/motivo-insuficiente.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { RejeitarAlteracaoCampanhaUseCase } from './rejeitar-alteracao-campanha';

const MOTIVO_VALIDO =
  'A regra proposta nao atende a politica vigente da plataforma.';

describe('RejeitarAlteracaoCampanhaUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let userRepository: InMemoryUserRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let mailer: FakeMailer;
  let sut: RejeitarAlteracaoCampanhaUseCase;

  const admin = UserFactory.create({ role: UserRole.ADMIN });

  beforeEach(() => {
    campanhaRepository = new InMemoryCampanhaRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    userRepository = new InMemoryUserRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    mailer = new FakeMailer();
    sut = new RejeitarAlteracaoCampanhaUseCase(
      campanhaRepository,
      empresaRepository,
      userRepository,
      registroAuditoriaRepository,
      mailer,
    );
  });

  async function salva(campanha: Campanha): Promise<Campanha> {
    return (await campanhaRepository.findById(campanha.id.toString()))!;
  }
  it('rejeita com NotAllowedError e nao grava nada quando o usuario nao e admin', async () => {
    const campanha = CampanhaFactory.aprovadaComAlteracao();
    await campanhaRepository.create(campanha);
    const naoAdmin = UserFactory.create({ role: UserRole.EMPRESA });

    const res = await sut.execute(
      campanha.id.toString(),
      naoAdmin,
      MOTIVO_VALIDO,
    );

    expect(res.isLeft()).toBe(true);
    expect(res.value).toBeInstanceOf(NotAllowedError);
    const depois = await salva(campanha);
    expect(depois.alteracaoPendente?.status).toBe(AlteracaoStatus.EM_ANALISE);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });
  it('rejeita com ResourceNotFoundError quando a campanha nao existe', async () => {
    const res = await sut.execute('id-inexistente', admin, MOTIVO_VALIDO);
    expect(res.value).toBeInstanceOf(ResourceNotFoundError);
  });
  it('rejeita com TransicaoInvalidaError quando nao ha alteracao pendente', async () => {
    const campanha = CampanhaFactory.aprovada(); // sem alteracao
    await campanhaRepository.create(campanha);
    const res = await sut.execute(campanha.id.toString(), admin, MOTIVO_VALIDO);
    expect(res.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });
  it('rejeita com MotivoInsuficienteError quando o motivo e curto', async () => {
    const campanha = CampanhaFactory.aprovadaComAlteracao();
    await campanhaRepository.create(campanha);
    const res = await sut.execute(campanha.id.toString(), admin, 'curto');
    expect(res.value).toBeInstanceOf(MotivoInsuficienteError);
    const depois = await salva(campanha);
    expect(depois.alteracaoPendente?.status).toBe(AlteracaoStatus.EM_ANALISE);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });
  it('mantem a campanha APROVADA com o compromisso antigo, guarda o motivo e audita', async () => {
    const campanha = CampanhaFactory.aprovadaComAlteracao();
    await campanhaRepository.create(campanha);
    const compromissoAntes = campanha.compromissoVigente()!;
    const res = await sut.execute(campanha.id.toString(), admin, MOTIVO_VALIDO);
    expect(res.isRight()).toBe(true);
    const depois = await salva(campanha);
    expect(depois.status).toBe(CampanhaStatus.APROVADA);
    expect(depois.compromissoVigente()?.equals(compromissoAntes)).toBe(true); // igual antes e depois
    expect(depois.alteracaoPendente).toBeFalsy();
    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(registroAuditoriaRepository.items[0].tipo).toBe(
      'ALTERACAO_CAMPANHA_REJEITADA',
    );
  });
  it('conclui a rejeicao mesmo quando o envio do e-mail falha', async () => {
    const campanha = CampanhaFactory.aprovadaComAlteracao();
    await campanhaRepository.create(campanha);
    mailer.forceFailure();
    const res = await sut.execute(campanha.id.toString(), admin, MOTIVO_VALIDO);
    expect(res.isRight()).toBe(true);
    expect((await salva(campanha)).status).toBe(CampanhaStatus.APROVADA);
    expect(registroAuditoriaRepository.items).toHaveLength(1);
  });
});
