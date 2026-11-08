import { Either } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { AlteracaoStatus } from '../entities/alteracao-compromisso';
import { Beneficiada } from '@domain/fivo/catalogo';
import { Campanha, CampanhaProps, CampanhaStatus } from '../entities/campanha';
import { UserRole } from '@domain/fivo/identidade';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { UserFactory } from '@test/factories/user-factory';
import { InMemoryCampanhaRepository } from '@test/doubles/in-memory-campanha-repository';
import { InMemoryEmpresaRepository } from '@test/doubles/in-memory-empresa-repository';
import { InMemoryUserRepository } from '@test/doubles/in-memory-user-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/doubles/in-memory-registro-auditoria-repository';
import { FakeMailer } from '@test/doubles/fake-mailer';
import {
  MotivoInsuficienteError,
  TransicaoInvalidaError,
  TemplateEmail,
} from '@domain/fivo/shared';
import { RejeitarAlteracaoCampanhaUseCase } from './rejeitar-alteracao-campanha';

const MOTIVO_VALIDO =
  'A regra proposta nao atende a politica vigente da plataforma.';
const EMAIL_DONO = 'dono@empresa.com';
const INSTITUICAO_ID = new UniqueEntityId().toString();

function valor<T>(resultado: Either<Error, T>): T {
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

// Outra operação grava a campanha logo depois de cada leitura, então a versão
// guardada deixa de ser a que o caso de uso leu.
class RepositorioComGravacaoConcorrente extends InMemoryCampanhaRepository {
  override async findById(id: string): Promise<Campanha | null> {
    const lida = await super.findById(id);
    const concorrente = await super.findById(id);

    if (concorrente) {
      await this.salvar(concorrente, concorrente.versao);
    }

    return lida;
  }
}

describe('RejeitarAlteracaoCampanhaUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let userRepository: InMemoryUserRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let mailer: FakeMailer;
  let sut: RejeitarAlteracaoCampanhaUseCase;

  const admin = UserFactory.create({ role: UserRole.ADMIN });

  function criarSut(): RejeitarAlteracaoCampanhaUseCase {
    return new RejeitarAlteracaoCampanhaUseCase(
      campanhaRepository,
      empresaRepository,
      userRepository,
      registroAuditoriaRepository,
      mailer,
    );
  }

  beforeEach(() => {
    campanhaRepository = new InMemoryCampanhaRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    userRepository = new InMemoryUserRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();
    mailer = new FakeMailer();
    sut = criarSut();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Campanha aprovada de uma empresa cujo dono tem e-mail cadastrado. A
  // alteração padrão da factory troca R$ 1,00 por unidade por 10%.
  async function criarComAlteracao(
    criar: (props: Partial<CampanhaProps>) => Campanha = (props) =>
      CampanhaFactory.aprovadaComAlteracao(props),
  ): Promise<Campanha> {
    const dono = UserFactory.create({
      role: UserRole.EMPRESA,
      email: EMAIL_DONO,
    });
    await userRepository.create(dono);
    const empresa = EmpresaFactory.create({ usuarioId: dono.id });
    await empresaRepository.create(empresa);
    const campanha = criar({
      empresaId: empresa.id,
      beneficiada: valor(Beneficiada.criar({ instituicaoId: INSTITUICAO_ID })),
    });
    await campanhaRepository.create(campanha);
    return campanha;
  }

  async function salva(campanha: Campanha): Promise<Campanha> {
    return (await campanhaRepository.findById(campanha.id.toString()))!;
  }

  // Nada gravado: pendência intacta, versão igual, sem auditoria, sem e-mail
  // e sem alteração decidida no repositório.
  async function expectNadaGravado(campanha: Campanha): Promise<void> {
    const depois = await salva(campanha);
    expect(depois.alteracaoPendente?.status).toBe(AlteracaoStatus.EM_ANALISE);
    expect(depois.versao).toBe(campanha.versao);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
    expect(campanhaRepository.alteracoesDecididas).toHaveLength(0);
  }

  it('rejeita com NotAllowedError e nao grava nada quando o usuario nao e admin', async () => {
    const campanha = await criarComAlteracao();
    const naoAdmin = UserFactory.create({ role: UserRole.EMPRESA });

    const res = await sut.execute(
      campanha.id.toString(),
      naoAdmin,
      MOTIVO_VALIDO,
    );

    expect(res.isLeft()).toBe(true);
    expect(res.value).toBeInstanceOf(NotAllowedError);
    await expectNadaGravado(campanha);
  });
  it('rejeita com ResourceNotFoundError quando a campanha nao existe', async () => {
    const res = await sut.execute('id-inexistente', admin, MOTIVO_VALIDO);
    expect(res.isLeft()).toBe(true);
    expect(res.value).toBeInstanceOf(ResourceNotFoundError);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
  });
  it('rejeita com TransicaoInvalidaError quando nao ha alteracao pendente', async () => {
    const campanha = await criarComAlteracao((props) =>
      CampanhaFactory.aprovada(props),
    );
    const res = await sut.execute(campanha.id.toString(), admin, MOTIVO_VALIDO);
    expect(res.isLeft()).toBe(true);
    expect(res.value).toBeInstanceOf(TransicaoInvalidaError);
    const depois = await salva(campanha);
    expect(depois.alteracaoPendente).toBeFalsy();
    expect(depois.versao).toBe(campanha.versao);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
    expect(campanhaRepository.alteracoesDecididas).toHaveLength(0);
  });
  it('rejeita com MotivoInsuficienteError quando o motivo e curto', async () => {
    const campanha = await criarComAlteracao();
    const res = await sut.execute(campanha.id.toString(), admin, 'curto');
    expect(res.isLeft()).toBe(true);
    expect(res.value).toBeInstanceOf(MotivoInsuficienteError);
    await expectNadaGravado(campanha);
  });
  it('mantem a campanha APROVADA com o compromisso antigo, guarda o motivo e audita', async () => {
    const campanha = await criarComAlteracao();
    const compromissoAntes = campanha.compromissoVigente()!;
    const res = await sut.execute(campanha.id.toString(), admin, MOTIVO_VALIDO);
    expect(res.isRight()).toBe(true);
    const depois = await salva(campanha);
    expect(depois.status).toBe(CampanhaStatus.APROVADA);
    expect(depois.compromissoVigente()?.equals(compromissoAntes)).toBe(true); // igual antes e depois
    expect(depois.alteracaoPendente).toBeFalsy();
    expect(depois.versao).toBe(campanha.versao + 1);
    expect(depois.idPublico.equals(campanha.idPublico)).toBe(true);
    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(registroAuditoriaRepository.items[0].tipo).toBe(
      'ALTERACAO_CAMPANHA_REJEITADA',
    );
  });
  it('audita a rejeicao com o admin, os dois compromissos, o motivo e a data-hora', async () => {
    const agora = new Date('2026-10-21T15:00:00Z');
    jest.useFakeTimers({ now: agora });
    const campanha = await criarComAlteracao();

    const res = await sut.execute(campanha.id.toString(), admin, MOTIVO_VALIDO);

    expect(res.isRight()).toBe(true);
    expect(registroAuditoriaRepository.items).toHaveLength(1);
    const [registro] = registroAuditoriaRepository.items;
    expect(registro.tipo).toBe('ALTERACAO_CAMPANHA_REJEITADA');
    expect(registro.usuarioId).toBe(admin.id.toString());
    expect(registro.entidadeId).toBe(campanha.id.toString());
    expect(registro.criadoEm).toEqual(agora);
    expect(registro.dados).toEqual({
      compromissoAnterior: {
        beneficiada: { tipo: 'INSTITUICAO', id: INSTITUICAO_ID },
        regraDoacao: { tipo: 'POR_UNIDADE', valor: '1.00' },
        vigencia: { inicio: '2026-10-01' },
      },
      compromissoProposto: {
        beneficiada: { tipo: 'INSTITUICAO', id: INSTITUICAO_ID },
        regraDoacao: { tipo: 'PERCENTUAL', percentual: '10.00' },
        vigencia: { inicio: '2026-10-01' },
      },
      motivo: MOTIVO_VALIDO,
    });
  });
  it('envia ao dono o e-mail de alteracao rejeitada com o nome da campanha e o motivo', async () => {
    const campanha = await criarComAlteracao();

    const res = await sut.execute(campanha.id.toString(), admin, MOTIVO_VALIDO);

    expect(res.isRight()).toBe(true);
    expect(mailer.mensagens).toEqual([
      {
        para: EMAIL_DONO,
        template: TemplateEmail.ALTERACAO_CAMPANHA_REJEITADA,
        dados: { nomeCampanha: campanha.nome.valor, motivo: MOTIVO_VALIDO },
      },
    ]);
  });
  it('grava a alteracao decidida com status REJEITADA, o admin, a data-hora e o motivo', async () => {
    const agora = new Date('2026-10-21T15:00:00Z');
    jest.useFakeTimers({ now: agora });
    const campanha = await criarComAlteracao();
    const alteracao = campanha.alteracaoPendente!;

    const res = await sut.execute(campanha.id.toString(), admin, MOTIVO_VALIDO);

    expect(res.isRight()).toBe(true);
    expect(campanhaRepository.alteracoesDecididas).toHaveLength(1);
    const [decidida] = campanhaRepository.alteracoesDecididas;
    expect(decidida.id.equals(alteracao.id)).toBe(true);
    expect(decidida.campanhaId.equals(campanha.id)).toBe(true);
    expect(decidida.status).toBe(AlteracaoStatus.REJEITADA);
    expect(decidida.decididoPor?.equals(admin.id)).toBe(true);
    expect(decidida.decididoEm).toEqual(agora);
    expect(decidida.motivo).toBe(MOTIVO_VALIDO);
  });
  it('conclui a rejeicao mesmo quando o envio do e-mail falha', async () => {
    const campanha = await criarComAlteracao();
    mailer.forceFailure();
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const res = await sut.execute(campanha.id.toString(), admin, MOTIVO_VALIDO);

    expect(res.isRight()).toBe(true);
    const depois = await salva(campanha);
    expect(depois.status).toBe(CampanhaStatus.APROVADA);
    expect(depois.alteracaoPendente).toBeFalsy();
    expect(depois.versao).toBe(campanha.versao + 1);
    expect(campanhaRepository.alteracoesDecididas[0]?.status).toBe(
      AlteracaoStatus.REJEITADA,
    );
    expect(registroAuditoriaRepository.items).toHaveLength(1);
    expect(mailer.mensagens).toHaveLength(0);
    // O Mailer foi chamado de verdade e falhou: o erro dele chega ao log.
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: 'Mailer indisponível no momento.' }),
    );
    consoleError.mockRestore();
  });
  it('rejeita com TransicaoInvalidaError quando outra operacao gravou a campanha antes', async () => {
    campanhaRepository = new RepositorioComGravacaoConcorrente();
    sut = criarSut();
    const campanha = await criarComAlteracao();
    const original = campanha.compromissoVigente()!;

    const res = await sut.execute(campanha.id.toString(), admin, MOTIVO_VALIDO);

    expect(res.isLeft()).toBe(true);
    expect(res.value).toBeInstanceOf(TransicaoInvalidaError);
    const depois = await salva(campanha);
    expect(depois.compromissoVigente()?.equals(original)).toBe(true);
    expect(depois.alteracaoPendente?.status).toBe(AlteracaoStatus.EM_ANALISE);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
    expect(mailer.mensagens).toHaveLength(0);
    expect(campanhaRepository.alteracoesDecididas).toHaveLength(0);
  });
});
