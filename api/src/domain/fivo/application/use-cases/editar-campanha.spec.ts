import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Campanha, CampanhaStatus } from '@domain/fivo/entities/campanha';
import { Empresa, EmpresaStatus } from '@domain/fivo/entities/empresa';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';
import { TipoRegraDoacao } from '@domain/fivo/entities/regra-doacao';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import { InMemoryCampanhaRepository } from '@test/repositories/in-memory-campanha-repository';
import { InMemoryCausaRepository } from '@test/repositories/in-memory-causa-repository';
import { InMemoryEmpresaRepository } from '@test/repositories/in-memory-empresa-repository';
import { InMemoryInstituicaoRepository } from '@test/repositories/in-memory-instituicao-repository';
import { InMemoryRegistroAuditoriaRepository } from '@test/repositories/in-memory-registro-auditoria-repository';
import { AlteracaoJaPendenteError } from '../errors/alteracao-ja-pendente.error';
import { BeneficiadaIndisponivelError } from '../errors/beneficiada-indisponivel.error';
import { CampanhaEmAnaliseError } from '../errors/campanha-em-analise.error';
import { NomeCampanhaInvalidoError } from '../errors/nome-campanha-invalido.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { AssegurarBeneficiadaDisponivelUseCase } from './assegurar-beneficiada-disponivel';
import { AssegurarEmpresaAprovadaUseCase } from './assegurar-empresa-aprovada';
import { ConsultarCampanhaDaEmpresaUseCase } from './consultar-campanha-da-empresa';
import {
  EditarCampanhaUseCase,
  EditarCampanhaUseCaseRequest,
} from './editar-campanha';

const MOTIVO = 'A regra de doacao nao esta clara para o consumidor';

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

describe('EditarCampanhaUseCase', () => {
  let campanhaRepository: InMemoryCampanhaRepository;
  let empresaRepository: InMemoryEmpresaRepository;
  let instituicaoRepository: InMemoryInstituicaoRepository;
  let causaRepository: InMemoryCausaRepository;
  let registroAuditoriaRepository: InMemoryRegistroAuditoriaRepository;
  let empresa: Empresa;
  let instituicao: Instituicao;
  let sut: EditarCampanhaUseCase;

  const usuarioId = new UniqueEntityId().toString();

  function montarSut() {
    sut = new EditarCampanhaUseCase(
      campanhaRepository,
      registroAuditoriaRepository,
      new AssegurarEmpresaAprovadaUseCase(empresaRepository),
      new AssegurarBeneficiadaDisponivelUseCase(
        instituicaoRepository,
        causaRepository,
      ),
    );
  }

  beforeEach(async () => {
    campanhaRepository = new InMemoryCampanhaRepository();
    empresaRepository = new InMemoryEmpresaRepository();
    instituicaoRepository = new InMemoryInstituicaoRepository();
    causaRepository = new InMemoryCausaRepository();
    registroAuditoriaRepository = new InMemoryRegistroAuditoriaRepository();

    empresa = EmpresaFactory.create({ status: EmpresaStatus.APROVADA });
    await empresaRepository.create(empresa);

    instituicao = InstituicaoFactory.create({
      status: InstituicaoStatus.APROVADA,
    });
    await instituicaoRepository.create(instituicao);

    montarSut();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function guardar(campanha: Campanha): Promise<Campanha> {
    await campanhaRepository.create(campanha);
    return campanha;
  }

  function pedido(
    campanha: Campanha,
    campos: Partial<EditarCampanhaUseCaseRequest> = {},
  ): EditarCampanhaUseCaseRequest {
    return {
      empresaId: empresa.id.toString(),
      usuarioId,
      campanhaId: campanha.id.toString(),
      ...campos,
    };
  }

  async function salva(campanha: Campanha): Promise<Campanha> {
    return (await campanhaRepository.findById(campanha.id.toString()))!;
  }

  function expectNadaGravado(campanha: Campanha) {
    expect(campanhaRepository.items[0].versao).toBe(campanha.versao);
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  }

  describe('who can edit', () => {
    it('rejects a company that is not approved with NotAllowedError (403)', async () => {
      const pendente = EmpresaFactory.create({
        status: EmpresaStatus.PENDENTE_APROVACAO,
      });
      await empresaRepository.create(pendente);
      const campanha = await guardar(
        CampanhaFactory.create({ empresaId: pendente.id }),
      );

      const response = await sut.execute({
        ...pedido(campanha, { nome: 'Nome novo' }),
        empresaId: pendente.id.toString(),
      });

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(NotAllowedError);
      expect((await salva(campanha)).nome.valor).toBe('Campanha Teste');
      expectNadaGravado(campanha);
    });

    it("answers ResourceNotFoundError for another company's campaign, saving nothing", async () => {
      const campanha = await guardar(CampanhaFactory.create());

      const response = await sut.execute(
        pedido(campanha, { nome: 'Nome novo' }),
      );

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
      expect((await salva(campanha)).nome.valor).toBe('Campanha Teste');
      expectNadaGravado(campanha);
    });

    it('answers ResourceNotFoundError for a campaign that does not exist', async () => {
      const response = await sut.execute({
        empresaId: empresa.id.toString(),
        usuarioId,
        campanhaId: 'non-existent-id',
        nome: 'Nome novo',
      });

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(ResourceNotFoundError);
    });
  });

  describe('draft', () => {
    it('applies only the fields sent and returns the detail with decimal values', async () => {
      const agora = new Date('2026-10-21T15:00:00Z');
      jest.useFakeTimers({ now: agora });
      const campanha = await guardar(
        CampanhaFactory.create({ empresaId: empresa.id }),
      );

      const response = await sut.execute(
        pedido(campanha, {
          descricao: 'Cada produto vendido ajuda uma instituicao.',
          meta: '1500.5',
          instituicaoId: instituicao.id.toString(),
          regraDoacao: { tipo: TipoRegraDoacao.PERCENTUAL, percentual: '12.5' },
          vigencia: { inicio: '2026-11-01', fim: '2026-12-31' },
        }),
      );

      expect(response.isRight()).toBe(true);
      expect(response.value).toEqual({
        id: campanha.id.toString(),
        idPublico: campanha.idPublico.toString(),
        nome: 'Campanha Teste',
        descricao: 'Cada produto vendido ajuda uma instituicao.',
        capaArquivoId: null,
        beneficiada: { tipo: 'INSTITUICAO', id: instituicao.id.toString() },
        regraDoacao: { tipo: TipoRegraDoacao.PERCENTUAL, percentual: '12.50' },
        meta: '1500.50',
        vigencia: { inicio: '2026-11-01', fim: '2026-12-31' },
        status: CampanhaStatus.RASCUNHO,
        submetidaEm: null,
        motivoUltimaRejeicao: null,
        alteracaoPendente: null,
        criadaEm: agora,
        atualizadaEm: agora,
      });

      const depois = await salva(campanha);
      expect(depois.versao).toBe(campanha.versao + 1);
      expect(depois.meta?.centavos).toBe(150050);
      expect(registroAuditoriaRepository.items).toHaveLength(0);
    });

    it('returns the first invalid field error and saves nothing', async () => {
      const campanha = await guardar(
        CampanhaFactory.create({ empresaId: empresa.id }),
      );

      const response = await sut.execute(
        pedido(campanha, { nome: '', descricao: 'Descricao nova' }),
      );

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(NomeCampanhaInvalidoError);
      expect((await salva(campanha)).descricao).toBeFalsy();
      expectNadaGravado(campanha);
    });

    it('rejects a new beneficiary that is not available, saving nothing', async () => {
      const suspensa = InstituicaoFactory.create({
        status: InstituicaoStatus.SUSPENSA,
      });
      await instituicaoRepository.create(suspensa);
      const campanha = await guardar(
        CampanhaFactory.create({ empresaId: empresa.id }),
      );

      const response = await sut.execute(
        pedido(campanha, { instituicaoId: suspensa.id.toString() }),
      );

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(BeneficiadaIndisponivelError);
      expect((await salva(campanha)).beneficiada).toBeFalsy();
      expectNadaGravado(campanha);
    });

    it('does not check the beneficiary again when the same one is sent', async () => {
      // A beneficiada da factory não está no catálogo em memória.
      const campanha = await guardar(
        CampanhaFactory.completa({ empresaId: empresa.id }),
      );

      const response = await sut.execute(
        pedido(campanha, {
          instituicaoId: campanha.beneficiada!.id,
          meta: '100',
        }),
      );

      expect(response.isRight()).toBe(true);
    });
  });

  describe('rejected campaign', () => {
    it('goes back to draft, keeps the rejection reason and audits CAMPANHA_REABERTA', async () => {
      const campanha = await guardar(
        CampanhaFactory.completa({
          empresaId: empresa.id,
          status: CampanhaStatus.REJEITADA,
          motivoUltimaRejeicao: MOTIVO,
        }),
      );

      const response = await sut.execute(
        pedido(campanha, { descricao: 'Descricao corrigida' }),
      );

      expect(response.isRight()).toBe(true);
      if (response.isRight()) {
        expect(response.value.status).toBe(CampanhaStatus.RASCUNHO);
        expect(response.value.motivoUltimaRejeicao).toBe(MOTIVO);
      }

      expect(registroAuditoriaRepository.items).toHaveLength(1);
      const [registro] = registroAuditoriaRepository.items;
      expect(registro.tipo).toBe('CAMPANHA_REABERTA');
      expect(registro.usuarioId).toBe(usuarioId);
      expect(registro.entidadeId).toBe(campanha.id.toString());
      expect(registro.dados).toEqual({
        estadoAnterior: CampanhaStatus.REJEITADA,
        estadoNovo: CampanhaStatus.RASCUNHO,
      });
    });
  });

  describe('approved campaign', () => {
    it('applies text edits right away without auditing', async () => {
      const campanha = await guardar(
        CampanhaFactory.aprovada({ empresaId: empresa.id }),
      );

      const response = await sut.execute(
        pedido(campanha, { nome: 'Nome novo', meta: '2000' }),
      );

      expect(response.isRight()).toBe(true);
      if (response.isRight()) {
        expect(response.value.status).toBe(CampanhaStatus.APROVADA);
        expect(response.value.nome).toBe('Nome novo');
        expect(response.value.alteracaoPendente).toBeNull();
      }
      expect(registroAuditoriaRepository.items).toHaveLength(0);
    });

    it('opens a pending change for the commitment, keeps the approved values and audits it', async () => {
      const campanha = await guardar(
        CampanhaFactory.aprovada({ empresaId: empresa.id }),
      );
      const regraAprovada = campanha.regraDoacao;

      const response = await sut.execute(
        pedido(campanha, {
          regraDoacao: { tipo: TipoRegraDoacao.POR_UNIDADE, valor: '2.5' },
        }),
      );

      expect(response.isRight()).toBe(true);
      if (response.isRight()) {
        expect(response.value.status).toBe(CampanhaStatus.APROVADA);
        expect(response.value.regraDoacao).toEqual({
          tipo: TipoRegraDoacao.POR_UNIDADE,
          valor: '1.00',
        });
        expect(response.value.alteracaoPendente).toEqual(
          expect.objectContaining({
            regraDoacao: { tipo: TipoRegraDoacao.POR_UNIDADE, valor: '2.50' },
          }),
        );
      }

      const depois = await salva(campanha);
      expect(depois.regraDoacao?.equals(regraAprovada!)).toBe(true);
      expect(depois.alteracaoPendente).toBeTruthy();
      expect(depois.idPublico.equals(campanha.idPublico)).toBe(true);

      expect(registroAuditoriaRepository.items).toHaveLength(1);
      const [registro] = registroAuditoriaRepository.items;
      expect(registro.tipo).toBe('ALTERACAO_CAMPANHA_ABERTA');
      expect(registro.usuarioId).toBe(usuarioId);
      expect(registro.dados).toEqual({
        compromissoAnterior: expect.objectContaining({
          regraDoacao: { tipo: TipoRegraDoacao.POR_UNIDADE, valor: '1.00' },
        }) as unknown,
        compromissoProposto: expect.objectContaining({
          regraDoacao: { tipo: TipoRegraDoacao.POR_UNIDADE, valor: '2.50' },
        }) as unknown,
      });
    });

    it('rejects a second commitment change while one is pending with AlteracaoJaPendenteError', async () => {
      const campanha = await guardar(
        CampanhaFactory.aprovadaComAlteracao({ empresaId: empresa.id }),
      );

      const response = await sut.execute(
        pedido(campanha, { vigencia: { inicio: '2026-11-01' } }),
      );

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(AlteracaoJaPendenteError);
      expectNadaGravado(campanha);
    });
  });

  describe('cover image', () => {
    it.each([
      ['a draft', CampanhaStatus.RASCUNHO],
      ['an approved campaign', CampanhaStatus.APROVADA],
    ])(
      'applies and saves a new cover on %s without opening a change or auditing',
      async (_caso, status) => {
        const campanha = await guardar(
          CampanhaFactory.completa({
            empresaId: empresa.id,
            status,
            capaArquivoId: new UniqueEntityId(),
          }),
        );
        const novaCapa = new UniqueEntityId().toString();

        const response = await sut.execute(
          pedido(campanha, { capaArquivoId: novaCapa }),
        );

        expect(response.isRight()).toBe(true);
        if (response.isRight()) {
          expect(response.value.capaArquivoId).toBe(novaCapa);
        }
        const depois = await salva(campanha);
        expect(depois.capaArquivoId?.toString()).toBe(novaCapa);
        expect(depois.status).toBe(status);
        expect(depois.alteracaoPendente).toBeFalsy();
        expect(depois.versao).toBe(campanha.versao + 1);
        expect(registroAuditoriaRepository.items).toHaveLength(0);
      },
    );

    it('rejects a new cover on a campaign under review with CampanhaEmAnaliseError, saving nothing', async () => {
      const capaAtual = new UniqueEntityId();
      const campanha = await guardar(
        CampanhaFactory.emAnalise({
          empresaId: empresa.id,
          capaArquivoId: capaAtual,
        }),
      );

      const response = await sut.execute(
        pedido(campanha, { capaArquivoId: new UniqueEntityId().toString() }),
      );

      expect(response.isLeft()).toBe(true);
      expect(response.value).toBeInstanceOf(CampanhaEmAnaliseError);
      expect((await salva(campanha)).capaArquivoId?.equals(capaAtual)).toBe(
        true,
      );
      expectNadaGravado(campanha);
    });
  });

  it('returns the same detail read model as the company query for the same campaign', async () => {
    const campanha = await guardar(
      CampanhaFactory.aprovada({
        empresaId: empresa.id,
        capaArquivoId: new UniqueEntityId(),
      }),
    );

    const edicao = await sut.execute(
      pedido(campanha, {
        descricao: 'Descricao revisada',
        meta: '250',
        vigencia: { inicio: '2026-10-01', fim: '2027-03-31' },
      }),
    );
    const consulta = await new ConsultarCampanhaDaEmpresaUseCase(
      campanhaRepository,
    ).execute({
      empresaId: empresa.id.toString(),
      campanhaId: campanha.id.toString(),
    });

    expect(edicao.isRight()).toBe(true);
    expect(consulta.isRight()).toBe(true);
    expect(edicao.value).toStrictEqual(consulta.value);
  });

  it('rejects editing a campaign under review with CampanhaEmAnaliseError', async () => {
    const campanha = await guardar(
      CampanhaFactory.emAnalise({ empresaId: empresa.id }),
    );

    const response = await sut.execute(pedido(campanha, { nome: 'Nome novo' }));

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(CampanhaEmAnaliseError);
    expectNadaGravado(campanha);
  });

  it('answers TransicaoInvalidaError when another operation saved the campaign first', async () => {
    campanhaRepository = new RepositorioComGravacaoConcorrente();
    montarSut();
    const campanha = await guardar(
      CampanhaFactory.aprovada({ empresaId: empresa.id }),
    );

    const response = await sut.execute(
      pedido(campanha, {
        regraDoacao: { tipo: TipoRegraDoacao.POR_UNIDADE, valor: '2.5' },
      }),
    );

    expect(response.isLeft()).toBe(true);
    expect(response.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(campanhaRepository.items[0].alteracaoPendente).toBeFalsy();
    expect(registroAuditoriaRepository.items).toHaveLength(0);
  });
});
