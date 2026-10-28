import { randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';

import { Either } from '@core/either';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { CampanhaRepository } from '@domain/fivo/campanhas/ports/campanha-repository';
import { CausaRepository } from '@domain/fivo/catalogo/ports/causa-repository';
import { EmpresaRepository } from '@domain/fivo/empresas/ports/empresa-repository';
import { InstituicaoRepository } from '@domain/fivo/catalogo/ports/instituicao-repository';
import {
  AlteracaoCompromisso,
  AlteracaoStatus,
} from '@domain/fivo/campanhas/entities/alteracao-compromisso';
import { Beneficiada } from '@domain/fivo/catalogo/entities/beneficiada';
import {
  Campanha,
  CampanhaProps,
  CampanhaStatus,
} from '@domain/fivo/campanhas/entities/campanha';
import { Compromisso } from '@domain/fivo/campanhas/entities/compromisso';
import { DataCalendario } from '@domain/fivo/campanhas/entities/data-calendario';
import { DescricaoCampanha } from '@domain/fivo/campanhas/entities/descricao-campanha';
import { DocumentoValidacao } from '@domain/fivo/catalogo/entities/documento-validacao';
import { NomeCampanha } from '@domain/fivo/campanhas/entities/nome-campanha';
import {
  RegraDoacao,
  TipoRegraDoacao,
} from '@domain/fivo/campanhas/entities/regra-doacao';
import { ValorMonetario } from '@domain/fivo/campanhas/entities/valor-monetario';
import { Vigencia } from '@domain/fivo/campanhas/entities/vigencia';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { CausaFactory } from '@test/factories/causa-factory';
import { cnpjValido } from '@test/factories/cnpj-factory';
import { EmpresaFactory } from '@test/factories/empresa-factory';
import { InstituicaoFactory } from '@test/factories/instituicao-factory';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

const MOTIVO_REJEICAO = 'A nova regra de doação não condiz com a embalagem.';

function valor<T>(resultado: Either<Error, T>): T {
  if (resultado.isLeft()) {
    throw resultado.value;
  }

  return resultado.value;
}

function data(texto: string): DataCalendario {
  return valor(DataCalendario.criar(texto));
}

function porUnidade(decimal: string): RegraDoacao {
  return valor(
    RegraDoacao.criar({ tipo: TipoRegraDoacao.POR_UNIDADE, valor: decimal }),
  );
}

function percentual(decimal: string): RegraDoacao {
  return valor(
    RegraDoacao.criar({
      tipo: TipoRegraDoacao.PERCENTUAL,
      percentual: decimal,
    }),
  );
}

function hoje(): DataCalendario {
  return DataCalendario.hojeEm(new Date());
}

describe('PrismaCampanhaRepository (e2e)', () => {
  let contexto: AppDeTeste;
  let repository: CampanhaRepository;
  let empresaId: UniqueEntityId;
  let instituicaoId: string;
  let causaId: string;

  async function criarArquivo(
    tipo: 'DOCUMENTO_INSTITUICAO' | 'IMAGEM_CAMPANHA',
  ): Promise<string> {
    const id = randomUUID();

    await contexto.prisma.arquivo.create({
      data: {
        id,
        tipo,
        nomeOriginal: 'arquivo',
        mime: 'image/png',
        bytes: 2048,
        chaveStorage: `${id}/arquivo`,
      },
    });

    return id;
  }

  function daInstituicao(): Beneficiada {
    return valor(Beneficiada.criar({ instituicaoId }));
  }

  function daCausa(): Beneficiada {
    return valor(Beneficiada.criar({ causaId }));
  }

  /** Aprovada, com FKs válidas, a regra R$ 1,00 por unidade e sem pendência. */
  function aprovada(props: Partial<CampanhaProps> = {}): Campanha {
    return CampanhaFactory.aprovada({
      empresaId,
      beneficiada: daInstituicao(),
      ...props,
    });
  }

  /** Aprovada com uma alteração em análise que troca a regra por 12,05%. */
  function aprovadaComAlteracao(props: Partial<CampanhaProps> = {}): Campanha {
    const anterior = Compromisso.criar({
      beneficiada: daInstituicao(),
      regraDoacao: porUnidade('1.00'),
      vigencia: valor(Vigencia.criar({ inicio: data('2026-10-01') })),
    });

    return CampanhaFactory.aprovadaComAlteracao(
      {
        empresaId,
        beneficiada: anterior.beneficiada,
        regraDoacao: anterior.regraDoacao,
        vigencia: anterior.vigencia,
        ...props,
      },
      { proposto: anterior.mesclar({ regraDoacao: percentual('12.05') }) },
    );
  }

  async function carregar(id: UniqueEntityId): Promise<Campanha> {
    const campanha = await repository.findById(id.toString());

    if (!campanha) {
      throw new Error(`Campanha ${id.toString()} não encontrada`);
    }

    return campanha;
  }

  function linhasDeAlteracao(campanhaId: UniqueEntityId) {
    return contexto.prisma.campanhaAlteracao.findMany({
      where: { campanhaId: campanhaId.toString() },
      orderBy: { criadoEm: 'asc' },
    });
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    repository = contexto.app.get(CampanhaRepository);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);

    const empresa = EmpresaFactory.create();
    await contexto.app.get(EmpresaRepository).create(empresa);
    empresaId = empresa.id;

    const causa = CausaFactory.create({ nome: 'Educação' });
    await contexto.app.get(CausaRepository).create(causa);
    causaId = causa.id.toString();

    const documentoArquivoId = await criarArquivo('DOCUMENTO_INSTITUICAO');
    const instituicao = InstituicaoFactory.create({
      cnpj: cnpjValido(1),
      causaId: causa.id,
      documento: valor(DocumentoValidacao.criar(documentoArquivoId)),
      usuarioId: null,
    });
    await contexto.app.get(InstituicaoRepository).create(instituicao);
    instituicaoId = instituicao.id.toString();
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  describe('ida e volta', () => {
    it('grava e reconstrói cada coluna da campanha e da alteração pendente', async () => {
      const capaArquivoId = await criarArquivo('IMAGEM_CAMPANHA');
      const adminId = new UniqueEntityId();
      const id = new UniqueEntityId();
      const anterior = Compromisso.criar({
        beneficiada: daInstituicao(),
        regraDoacao: porUnidade('1.05'),
        vigencia: valor(
          Vigencia.criar({
            inicio: data('2026-01-01'),
            fim: data('2026-12-31'),
          }),
        ),
      });
      const proposto = Compromisso.criar({
        beneficiada: daCausa(),
        regraDoacao: percentual('12.05'),
        vigencia: valor(
          Vigencia.criar({
            inicio: data('2026-02-01'),
            fim: data('2027-01-31'),
          }),
        ),
      });
      const campanha = Campanha.create(
        {
          empresaId,
          nome: valor(NomeCampanha.criar('Doe Sorrisos')),
          descricao: valor(
            DescricaoCampanha.criar('<b>Cada</b> pacote ajuda uma escola.'),
          ),
          capaArquivoId: new UniqueEntityId(capaArquivoId),
          beneficiada: anterior.beneficiada,
          regraDoacao: anterior.regraDoacao,
          meta: valor(ValorMonetario.deDecimal('999999.99')),
          vigencia: anterior.vigencia,
          status: CampanhaStatus.APROVADA,
          submetidaEm: new Date('2026-03-01T10:11:12.345Z'),
          decididoPor: adminId,
          decididoEm: new Date('2026-03-02T13:14:15.678Z'),
          motivoUltimaRejeicao: 'Motivo da rejeição anterior da campanha.',
          alteracaoPendente: AlteracaoCompromisso.create({
            campanhaId: id,
            anterior,
            proposto,
            createdAt: new Date('2026-03-05T08:09:10.111Z'),
          }),
          versao: 3,
          createdAt: new Date('2026-02-28T01:02:03.004Z'),
          updatedAt: new Date('2026-03-05T08:09:10.222Z'),
        },
        id,
      );
      const alteracaoId = campanha.alteracaoPendente!.id.toString();

      await repository.create(campanha);

      const linha = await contexto.prisma.campanha.findUniqueOrThrow({
        where: { id: id.toString() },
      });
      expect(linha).toEqual({
        id: id.toString(),
        idPublico: campanha.idPublico.toString(),
        empresaId: empresaId.toString(),
        nome: 'Doe Sorrisos',
        descricao: '<b>Cada</b> pacote ajuda uma escola.',
        capaArquivoId,
        instituicaoId,
        causaId: null,
        regraTipo: 'POR_UNIDADE',
        regraValorCentavos: 105,
        regraPercentualCentesimos: null,
        metaCentavos: 99999999,
        dataInicio: new Date('2026-01-01T00:00:00.000Z'),
        dataFim: new Date('2026-12-31T00:00:00.000Z'),
        status: 'APROVADA',
        submetidaEm: new Date('2026-03-01T10:11:12.345Z'),
        decididoPor: adminId.toString(),
        decididoEm: new Date('2026-03-02T13:14:15.678Z'),
        motivoUltimaRejeicao: 'Motivo da rejeição anterior da campanha.',
        versao: 3,
        criadoEm: new Date('2026-02-28T01:02:03.004Z'),
        atualizadoEm: new Date('2026-03-05T08:09:10.222Z'),
      });
      expect(await linhasDeAlteracao(id)).toEqual([
        {
          id: alteracaoId,
          campanhaId: id.toString(),
          instituicaoId: null,
          causaId,
          regraTipo: 'PERCENTUAL',
          regraValorCentavos: null,
          regraPercentualCentesimos: 1205,
          dataInicio: new Date('2026-02-01T00:00:00.000Z'),
          dataFim: new Date('2027-01-31T00:00:00.000Z'),
          status: 'EM_ANALISE',
          motivo: null,
          decididoPor: null,
          decididoEm: null,
          criadoEm: new Date('2026-03-05T08:09:10.111Z'),
        },
      ]);

      const lida = await carregar(id);
      expect(lida.id.toString()).toBe(id.toString());
      expect(lida.idPublico.toString()).toBe(campanha.idPublico.toString());
      expect(lida.empresaId.toString()).toBe(empresaId.toString());
      expect(lida.nome.valor).toBe('Doe Sorrisos');
      expect(lida.descricao?.valor).toBe(
        '<b>Cada</b> pacote ajuda uma escola.',
      );
      expect(lida.capaArquivoId?.toString()).toBe(capaArquivoId);
      expect(lida.beneficiada?.tipo).toBe('INSTITUICAO');
      expect(lida.beneficiada?.id).toBe(instituicaoId);
      expect(lida.regraDoacao?.tipo).toBe(TipoRegraDoacao.POR_UNIDADE);
      expect(lida.regraDoacao?.valor?.centavos).toBe(105);
      expect(lida.regraDoacao?.percentual).toBeUndefined();
      expect(lida.meta?.centavos).toBe(99999999);
      expect(lida.vigencia?.inicio.valor).toBe('2026-01-01');
      expect(lida.vigencia?.fim?.valor).toBe('2026-12-31');
      expect(lida.status).toBe(CampanhaStatus.APROVADA);
      expect(lida.submetidaEm).toEqual(new Date('2026-03-01T10:11:12.345Z'));
      expect(lida.decididoPor?.toString()).toBe(adminId.toString());
      expect(lida.decididoEm).toEqual(new Date('2026-03-02T13:14:15.678Z'));
      expect(lida.motivoUltimaRejeicao).toBe(
        'Motivo da rejeição anterior da campanha.',
      );
      expect(lida.versao).toBe(3);
      expect(lida.createdAt).toEqual(new Date('2026-02-28T01:02:03.004Z'));
      expect(lida.updatedAt).toEqual(new Date('2026-03-05T08:09:10.222Z'));
      expect(lida.alteracaoDecidida).toBeNull();

      const pendente = lida.alteracaoPendente!;
      expect(pendente.id.toString()).toBe(alteracaoId);
      expect(pendente.campanhaId.toString()).toBe(id.toString());
      expect(pendente.status).toBe(AlteracaoStatus.EM_ANALISE);
      expect(pendente.createdAt).toEqual(new Date('2026-03-05T08:09:10.111Z'));
      expect(pendente.decididoPor).toBeNull();
      expect(pendente.decididoEm).toBeNull();
      expect(pendente.motivo).toBeNull();
      expect(pendente.proposto.beneficiada.tipo).toBe('CAUSA');
      expect(pendente.proposto.beneficiada.id).toBe(causaId);
      expect(pendente.proposto.regraDoacao.tipo).toBe(
        TipoRegraDoacao.PERCENTUAL,
      );
      expect(pendente.proposto.regraDoacao.percentual?.percentual).toBe(1205);
      expect(pendente.proposto.regraDoacao.valor).toBeUndefined();
      expect(pendente.proposto.vigencia.inicio.valor).toBe('2026-02-01');
      expect(pendente.proposto.vigencia.fim?.valor).toBe('2027-01-31');
      // O anterior não tem coluna: é o compromisso que está na campanha.
      expect(pendente.anterior.beneficiada.id).toBe(instituicaoId);
      expect(pendente.anterior.regraDoacao.valor?.centavos).toBe(105);
      expect(pendente.anterior.vigencia.inicio.valor).toBe('2026-01-01');
      expect(pendente.anterior.vigencia.fim?.valor).toBe('2026-12-31');
    });

    it('rascunho só com o nome volta com todos os opcionais vazios', async () => {
      const campanha = CampanhaFactory.create({ empresaId });

      await repository.create(campanha);

      const linha = await contexto.prisma.campanha.findUniqueOrThrow({
        where: { id: campanha.id.toString() },
      });
      expect(linha).toMatchObject({
        descricao: null,
        capaArquivoId: null,
        instituicaoId: null,
        causaId: null,
        regraTipo: null,
        regraValorCentavos: null,
        regraPercentualCentesimos: null,
        metaCentavos: null,
        dataInicio: null,
        dataFim: null,
        status: 'RASCUNHO',
        submetidaEm: null,
        decididoPor: null,
        decididoEm: null,
        motivoUltimaRejeicao: null,
        versao: 0,
        atualizadoEm: null,
      });

      const lida = await carregar(campanha.id);
      expect(lida.status).toBe(CampanhaStatus.RASCUNHO);
      expect(lida.descricao).toBeNull();
      expect(lida.capaArquivoId).toBeNull();
      expect(lida.beneficiada).toBeNull();
      expect(lida.regraDoacao).toBeNull();
      expect(lida.meta).toBeNull();
      expect(lida.vigencia).toBeNull();
      expect(lida.submetidaEm).toBeNull();
      expect(lida.decididoPor).toBeNull();
      expect(lida.decididoEm).toBeNull();
      expect(lida.motivoUltimaRejeicao).toBeNull();
      expect(lida.alteracaoPendente).toBeNull();
      expect(lida.updatedAt).toBeNull();
    });

    it('a data de calendário 2026-01-01 volta 2026-01-01, sem deslocamento de fuso', async () => {
      const campanha = aprovada({
        vigencia: valor(
          Vigencia.criar({
            inicio: data('2026-01-01'),
            fim: data('2026-01-02'),
          }),
        ),
      });

      await repository.create(campanha);

      const [texto] = await contexto.prisma.$queryRaw<
        { data_inicio: string; data_fim: string }[]
      >(
        Prisma.sql`SELECT data_inicio::text, data_fim::text FROM campanha WHERE id = ${campanha.id.toString()}`,
      );
      expect(texto).toEqual({
        data_inicio: '2026-01-01',
        data_fim: '2026-01-02',
      });

      const lida = await carregar(campanha.id);
      expect(lida.vigencia?.inicio.valor).toBe('2026-01-01');
      expect(lida.vigencia?.fim?.valor).toBe('2026-01-02');
    });

    it('findByIdPublico encontra pela chave pública e devolve null para chave desconhecida', async () => {
      const campanha = aprovadaComAlteracao();
      await repository.create(campanha);

      const lida = await repository.findByIdPublico(
        campanha.idPublico.toString(),
      );

      expect(lida?.id.toString()).toBe(campanha.id.toString());
      expect(lida?.alteracaoPendente?.id.toString()).toBe(
        campanha.alteracaoPendente!.id.toString(),
      );
      expect(await repository.findByIdPublico(randomUUID())).toBeNull();
      expect(await repository.findById(randomUUID())).toBeNull();
    });

    it.each([
      ['nome fora do limite', { nome: 'ab' }, 'Nome inválido persistido'],
      ['meta zerada', { metaCentavos: 0 }, 'Meta inválido persistido'],
    ])(
      'dado persistido inválido (%s) lança erro na leitura',
      async (_caso, colunas, mensagem) => {
        const id = randomUUID();
        await contexto.prisma.campanha.create({
          data: {
            id,
            idPublico: randomUUID(),
            empresaId: empresaId.toString(),
            nome: 'Campanha válida',
            status: 'RASCUNHO',
            criadoEm: new Date(),
            ...colunas,
          },
        });

        await expect(repository.findById(id)).rejects.toThrow(
          `${mensagem} para a campanha ${id}`,
        );
      },
    );
  });

  describe('salvar', () => {
    it('incrementa a versão e grava as colunas alteradas', async () => {
      const campanha = CampanhaFactory.completa({
        empresaId,
        beneficiada: daInstituicao(),
      });
      await repository.create(campanha);

      const lida = await carregar(campanha.id);
      valor(lida.submeter(hoje()));

      expect(await repository.salvar(lida, 0)).toBe(true);

      const linha = await contexto.prisma.campanha.findUniqueOrThrow({
        where: { id: campanha.id.toString() },
      });
      expect(linha.versao).toBe(1);
      expect(linha.status).toBe('EM_ANALISE');
      expect(linha.submetidaEm).toEqual(lida.submetidaEm);
    });

    it('com versão diferente da guardada devolve false e não grava nada', async () => {
      const campanha = aprovadaComAlteracao();
      await repository.create(campanha);
      const antes = await contexto.prisma.campanha.findUniqueOrThrow({
        where: { id: campanha.id.toString() },
      });

      const lida = await carregar(campanha.id);
      valor(lida.rejeitarAlteracao(new UniqueEntityId(), MOTIVO_REJEICAO));
      valor(lida.editarTextos({ nome: valor(NomeCampanha.criar('Outro')) }));

      expect(await repository.salvar(lida, 7)).toBe(false);

      expect(
        await contexto.prisma.campanha.findUniqueOrThrow({
          where: { id: campanha.id.toString() },
        }),
      ).toEqual(antes);
      const [alteracao] = await linhasDeAlteracao(campanha.id);
      expect(alteracao.status).toBe('EM_ANALISE');
      expect(alteracao.motivo).toBeNull();
    });

    it('dois salvar concorrentes com a mesma versão: só um grava', async () => {
      const campanha = aprovadaComAlteracao();
      await repository.create(campanha);

      const primeira = await carregar(campanha.id);
      const segunda = await carregar(campanha.id);
      const adminA = new UniqueEntityId();
      const adminB = new UniqueEntityId();
      valor(primeira.aprovarAlteracao(adminA));
      valor(segunda.rejeitarAlteracao(adminB, MOTIVO_REJEICAO));

      const resultados = await Promise.all([
        repository.salvar(primeira, 0),
        repository.salvar(segunda, 0),
      ]);

      expect([...resultados].sort()).toEqual([false, true]);
      const vencedora = resultados[0] ? 'APROVADA' : 'REJEITADA';
      const linha = await contexto.prisma.campanha.findUniqueOrThrow({
        where: { id: campanha.id.toString() },
      });
      expect(linha.versao).toBe(1);
      const alteracoes = await linhasDeAlteracao(campanha.id);
      expect(alteracoes).toHaveLength(1);
      expect(alteracoes[0].status).toBe(vencedora);
      expect(alteracoes[0].decididoPor).toBe(
        (resultados[0] ? adminA : adminB).toString(),
      );
    });

    it('o índice parcial barra uma segunda alteração EM_ANALISE na mesma campanha', async () => {
      const campanha = aprovadaComAlteracao();
      await repository.create(campanha);
      const primeira = campanha.alteracaoPendente!;

      // Estado que o domínio não produz (abrirAlteracao recusa com
      // AlteracaoJaPendenteError): outra alteração pendente com versão
      // válida. Só o índice parcial segura.
      const lida = await carregar(campanha.id);
      const intrusa = Campanha.create(
        {
          empresaId: lida.empresaId,
          idPublico: lida.idPublico,
          nome: lida.nome,
          beneficiada: lida.beneficiada,
          regraDoacao: lida.regraDoacao,
          vigencia: lida.vigencia,
          status: lida.status,
          versao: lida.versao,
          createdAt: lida.createdAt,
          alteracaoPendente: AlteracaoCompromisso.create({
            campanhaId: lida.id,
            anterior: primeira.anterior,
            proposto: primeira.anterior.mesclar({
              regraDoacao: porUnidade('2.00'),
            }),
          }),
        },
        lida.id,
      );

      await expect(repository.salvar(intrusa, 0)).rejects.toMatchObject({
        code: 'P2002',
      });

      const alteracoes = await linhasDeAlteracao(campanha.id);
      expect(alteracoes.map((linha) => [linha.id, linha.status])).toEqual([
        [primeira.id.toString(), 'EM_ANALISE'],
      ]);
      const linha = await contexto.prisma.campanha.findUniqueOrThrow({
        where: { id: campanha.id.toString() },
      });
      expect(linha.versao).toBe(0);
    });

    it('o CHECK barra instituição e causa juntas na campanha e na alteração', async () => {
      const campanha = aprovada();
      await repository.create(campanha);

      await expect(
        contexto.prisma.campanha.update({
          where: { id: campanha.id.toString() },
          data: { causaId },
        }),
      ).rejects.toThrow(/campanha_beneficiada_xor/);

      await expect(
        contexto.prisma.campanhaAlteracao.create({
          data: {
            id: randomUUID(),
            campanhaId: campanha.id.toString(),
            instituicaoId,
            causaId,
            regraTipo: 'POR_UNIDADE',
            regraValorCentavos: 100,
            dataInicio: new Date('2026-10-01T00:00:00.000Z'),
            status: 'EM_ANALISE',
            criadoEm: new Date(),
          },
        }),
      ).rejects.toThrow(/campanha_alteracao_beneficiada_xor/);

      expect(await linhasDeAlteracao(campanha.id)).toEqual([]);
      const linha = await contexto.prisma.campanha.findUniqueOrThrow({
        where: { id: campanha.id.toString() },
      });
      expect(linha.causaId).toBeNull();
    });
  });

  describe('decisão da alteração', () => {
    it('aprovar grava a linha APROVADA com autor e data-hora e a campanha volta sem pendência', async () => {
      const campanha = aprovadaComAlteracao();
      await repository.create(campanha);
      const adminId = new UniqueEntityId();

      const lida = await carregar(campanha.id);
      valor(lida.aprovarAlteracao(adminId));
      const decididoEm = lida.alteracaoDecidida!.decididoEm;

      expect(await repository.salvar(lida, 0)).toBe(true);

      const alteracoes = await linhasDeAlteracao(campanha.id);
      expect(alteracoes).toHaveLength(1);
      expect(alteracoes[0]).toMatchObject({
        id: campanha.alteracaoPendente!.id.toString(),
        status: 'APROVADA',
        decididoPor: adminId.toString(),
        decididoEm,
        motivo: null,
        regraTipo: 'PERCENTUAL',
        regraPercentualCentesimos: 1205,
      });
      expect(decididoEm).toBeInstanceOf(Date);

      const recarregada = await carregar(campanha.id);
      expect(recarregada.alteracaoPendente).toBeNull();
      expect(recarregada.regraDoacao?.tipo).toBe(TipoRegraDoacao.PERCENTUAL);
      expect(recarregada.regraDoacao?.percentual?.percentual).toBe(1205);
      expect(recarregada.status).toBe(CampanhaStatus.APROVADA);
    });

    it('rejeitar grava a linha REJEITADA com autor, data-hora e motivo e a campanha volta sem pendência', async () => {
      const campanha = aprovadaComAlteracao();
      await repository.create(campanha);
      const adminId = new UniqueEntityId();

      const lida = await carregar(campanha.id);
      valor(lida.rejeitarAlteracao(adminId, MOTIVO_REJEICAO));
      const decididoEm = lida.alteracaoDecidida!.decididoEm;

      expect(await repository.salvar(lida, 0)).toBe(true);

      const alteracoes = await linhasDeAlteracao(campanha.id);
      expect(alteracoes).toHaveLength(1);
      expect(alteracoes[0]).toMatchObject({
        id: campanha.alteracaoPendente!.id.toString(),
        status: 'REJEITADA',
        decididoPor: adminId.toString(),
        decididoEm,
        motivo: MOTIVO_REJEICAO,
      });
      expect(decididoEm).toBeInstanceOf(Date);

      const recarregada = await carregar(campanha.id);
      expect(recarregada.alteracaoPendente).toBeNull();
      expect(recarregada.regraDoacao?.tipo).toBe(TipoRegraDoacao.POR_UNIDADE);
      expect(recarregada.regraDoacao?.valor?.centavos).toBe(100);
    });

    it('uma nova alteração aberta depois da decisão é gravada sem violar o índice parcial', async () => {
      const campanha = aprovadaComAlteracao();
      await repository.create(campanha);

      const decidida = await carregar(campanha.id);
      valor(decidida.rejeitarAlteracao(new UniqueEntityId(), MOTIVO_REJEICAO));
      expect(await repository.salvar(decidida, 0)).toBe(true);

      const reaberta = await carregar(campanha.id);
      valor(
        reaberta.editarCompromisso({ regraDoacao: porUnidade('3.00') }, hoje()),
      );
      expect(await repository.salvar(reaberta, 1)).toBe(true);

      const alteracoes = await linhasDeAlteracao(campanha.id);
      expect(alteracoes.map((linha) => [linha.id, linha.status])).toEqual([
        [campanha.alteracaoPendente!.id.toString(), 'REJEITADA'],
        [reaberta.alteracaoPendente!.id.toString(), 'EM_ANALISE'],
      ]);
      const recarregada = await carregar(campanha.id);
      expect(recarregada.alteracaoPendente?.id.toString()).toBe(
        reaberta.alteracaoPendente!.id.toString(),
      );
      expect(
        recarregada.alteracaoPendente?.proposto.regraDoacao.valor?.centavos,
      ).toBe(300);
    });

    it('decisão e nova abertura no mesmo salvar gravam a decidida antes da pendente', async () => {
      const campanha = aprovadaComAlteracao();
      await repository.create(campanha);
      const adminId = new UniqueEntityId();

      const lida = await carregar(campanha.id);
      valor(lida.aprovarAlteracao(adminId));
      valor(
        lida.editarCompromisso({ regraDoacao: porUnidade('3.00') }, hoje()),
      );
      const nova = lida.alteracaoPendente!;

      expect(await repository.salvar(lida, 0)).toBe(true);

      const alteracoes = await linhasDeAlteracao(campanha.id);
      expect(alteracoes).toHaveLength(2);
      expect(alteracoes[0]).toMatchObject({
        id: campanha.alteracaoPendente!.id.toString(),
        status: 'APROVADA',
        decididoPor: adminId.toString(),
      });
      expect(alteracoes[1]).toMatchObject({
        id: nova.id.toString(),
        status: 'EM_ANALISE',
        regraTipo: 'POR_UNIDADE',
        regraValorCentavos: 300,
        criadoEm: nova.createdAt,
      });

      const recarregada = await carregar(campanha.id);
      expect(recarregada.regraDoacao?.percentual?.percentual).toBe(1205);
      expect(recarregada.alteracaoPendente?.id.toString()).toBe(
        nova.id.toString(),
      );
      // O anterior da nova pendente é o compromisso recém-aprovado.
      expect(
        recarregada.alteracaoPendente?.anterior.regraDoacao.percentual
          ?.percentual,
      ).toBe(1205);
    });

    it('salvar duas vezes a mesma instância depois da decisão não duplica nem altera a linha decidida', async () => {
      const campanha = aprovadaComAlteracao();
      await repository.create(campanha);

      const lida = await carregar(campanha.id);
      valor(lida.rejeitarAlteracao(new UniqueEntityId(), MOTIVO_REJEICAO));
      expect(await repository.salvar(lida, 0)).toBe(true);
      const depoisDaPrimeira = await linhasDeAlteracao(campanha.id);

      expect(await repository.salvar(lida, 1)).toBe(true);

      const depoisDaSegunda = await linhasDeAlteracao(campanha.id);
      expect(depoisDaSegunda).toHaveLength(1);
      expect(depoisDaSegunda).toEqual(depoisDaPrimeira);
      expect(depoisDaSegunda[0].status).toBe('REJEITADA');
      expect(depoisDaSegunda[0].motivo).toBe(MOTIVO_REJEICAO);
    });

    it('a decidida sem linha prévia é inserida pelo upsert, sem perder a decisão', async () => {
      const campanha = aprovadaComAlteracao();
      await repository.create(campanha);
      const lida = await carregar(campanha.id);
      // Linha apagada por fora: um update simples não acharia o que gravar.
      await contexto.prisma.campanhaAlteracao.deleteMany({
        where: { campanhaId: campanha.id.toString() },
      });
      const adminId = new UniqueEntityId();
      valor(lida.rejeitarAlteracao(adminId, MOTIVO_REJEICAO));

      expect(await repository.salvar(lida, 0)).toBe(true);

      const alteracoes = await linhasDeAlteracao(campanha.id);
      expect(alteracoes).toHaveLength(1);
      expect(alteracoes[0]).toMatchObject({
        id: campanha.alteracaoPendente!.id.toString(),
        status: 'REJEITADA',
        decididoPor: adminId.toString(),
        decididoEm: lida.alteracaoDecidida!.decididoEm,
        motivo: MOTIVO_REJEICAO,
        regraPercentualCentesimos: 1205,
        criadoEm: campanha.alteracaoPendente!.createdAt,
      });
    });
  });

  describe('listarEmAnalise', () => {
    it('traz campanhas EM_ANALISE e APROVADA com alteração pendente, e nada mais', async () => {
      const emAnalise = CampanhaFactory.emAnalise({
        empresaId,
        beneficiada: daCausa(),
      });
      const comPendente = aprovadaComAlteracao();
      const semPendente = aprovada();
      const rascunho = CampanhaFactory.create({ empresaId });
      const rejeitada = CampanhaFactory.completa({
        empresaId,
        beneficiada: daInstituicao(),
        status: CampanhaStatus.REJEITADA,
      });
      const soHistorico = aprovadaComAlteracao();

      for (const campanha of [
        emAnalise,
        comPendente,
        semPendente,
        rascunho,
        rejeitada,
        soHistorico,
      ]) {
        await repository.create(campanha);
      }

      const decidida = await carregar(soHistorico.id);
      valor(decidida.aprovarAlteracao(new UniqueEntityId()));
      expect(await repository.salvar(decidida, 0)).toBe(true);

      const fila = await repository.listarEmAnalise();

      expect(fila.map((campanha) => campanha.id.toString()).sort()).toEqual(
        [emAnalise.id.toString(), comPendente.id.toString()].sort(),
      );
      const daFila = fila.find((campanha) =>
        campanha.id.equals(comPendente.id),
      );
      expect(daFila?.alteracaoPendente?.id.toString()).toBe(
        comPendente.alteracaoPendente!.id.toString(),
      );
      expect(daFila?.alteracaoPendente?.createdAt).toEqual(
        comPendente.alteracaoPendente!.createdAt,
      );
    });
  });
});
