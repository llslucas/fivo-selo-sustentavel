import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { AlteracaoJaPendenteError } from '../application/errors/alteracao-ja-pendente.error';
import { CampanhaEmAnaliseError } from '../application/errors/campanha-em-analise.error';
import { CamposPendentesError } from '../application/errors/campos-pendentes.error';
import { MotivoInsuficienteError } from '../application/errors/motivo-insuficiente.error';
import { TransicaoInvalidaError } from '../application/errors/transicao-invalida.error';
import { VigenciaVencidaError } from '../application/errors/vigencia-vencida.error';
import { AlteracaoStatus } from './alteracao-compromisso';
import { Beneficiada } from './beneficiada';
import { Campanha, CampanhaStatus } from './campanha';
import { Compromisso } from './compromisso';
import { DataCalendario } from './data-calendario';
import { DescricaoCampanha } from './descricao-campanha';
import { NomeCampanha } from './nome-campanha';
import { RegraDoacao, TipoRegraDoacao } from './regra-doacao';
import { ValorMonetario } from './valor-monetario';
import { Vigencia } from './vigencia';

function nome(texto: string): NomeCampanha {
  const resultado = NomeCampanha.criar(texto);
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function descricao(texto: string): DescricaoCampanha {
  const resultado = DescricaoCampanha.criar(texto);
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function data(texto: string): DataCalendario {
  const resultado = DataCalendario.criar(texto);
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function vigencia(inicio: string, fim?: string): Vigencia {
  const resultado = Vigencia.criar({
    inicio: data(inicio),
    fim: fim ? data(fim) : undefined,
  });
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function beneficiada(): Beneficiada {
  const resultado = Beneficiada.criar({
    instituicaoId: new UniqueEntityId().toString(),
  });
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function regraDoacao(): RegraDoacao {
  const resultado = RegraDoacao.criar({
    tipo: TipoRegraDoacao.POR_UNIDADE,
    valor: '1.50',
  });
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function meta(texto: string): ValorMonetario {
  const resultado = ValorMonetario.deDecimal(texto);
  if (resultado.isLeft()) throw resultado.value;
  return resultado.value;
}

function campanhaCompleta(fim?: string): Campanha {
  return CampanhaFactory.create({
    descricao: descricao('Cada produto vendido ajuda uma instituicao.'),
    beneficiada: beneficiada(),
    regraDoacao: regraDoacao(),
    vigencia: vigencia('2026-10-01', fim),
  });
}

function campanhaAprovada(): Campanha {
  return CampanhaFactory.create({
    status: CampanhaStatus.APROVADA,
    descricao: descricao('Cada produto vendido ajuda uma instituicao.'),
    beneficiada: beneficiada(),
    regraDoacao: regraDoacao(),
    vigencia: vigencia('2026-10-01', '2026-12-31'),
  });
}

const MOTIVO_ALTERACAO = 'A nova beneficiada nao combina com a campanha';

describe('Campanha', () => {
  const hoje = data('2026-10-21');

  it('is born as RASCUNHO with a public id different from the id', () => {
    const empresaId = new UniqueEntityId();

    const campanha = Campanha.criar({
      empresaId,
      nome: nome('Campanha de Natal'),
    });

    expect(campanha.status).toBe(CampanhaStatus.RASCUNHO);
    expect(campanha.empresaId).toEqual(empresaId);
    expect(campanha.nome.valor).toBe('Campanha de Natal');
    expect(campanha.idPublico).toBeInstanceOf(UniqueEntityId);
    expect(campanha.idPublico.equals(campanha.id)).toBe(false);
    expect(campanha.versao).toBe(0);
    expect(campanha.createdAt).toBeInstanceOf(Date);
  });

  it('applies text edits to a draft', () => {
    const campanha = CampanhaFactory.create();
    const capaArquivoId = new UniqueEntityId();

    const result = campanha.editarTextos({
      nome: nome('Nome novo'),
      descricao: descricao('Descricao nova'),
      capaArquivoId,
      meta: meta('1000'),
    });

    expect(result.isRight()).toBe(true);
    expect(campanha.status).toBe(CampanhaStatus.RASCUNHO);
    expect(campanha.nome.valor).toBe('Nome novo');
    expect(campanha.descricao?.valor).toBe('Descricao nova');
    expect(campanha.capaArquivoId).toEqual(capaArquivoId);
    expect(campanha.meta?.centavos).toBe(100000);
  });

  it('applies commitment edits to a draft', () => {
    const campanha = CampanhaFactory.create();
    const novaBeneficiada = beneficiada();
    const novaRegra = regraDoacao();
    const novaVigencia = vigencia('2026-11-01', '2026-12-31');

    const result = campanha.editarCompromisso(
      {
        beneficiada: novaBeneficiada,
        regraDoacao: novaRegra,
        vigencia: novaVigencia,
      },
      hoje,
    );

    expect(result.isRight()).toBe(true);
    expect(campanha.status).toBe(CampanhaStatus.RASCUNHO);
    expect(campanha.beneficiada).toBe(novaBeneficiada);
    expect(campanha.regraDoacao).toBe(novaRegra);
    expect(campanha.vigencia).toBe(novaVigencia);
  });

  it('keeps fields that were not sent in a partial edit', () => {
    const campanha = CampanhaFactory.create({
      descricao: descricao('Descricao original'),
    });

    campanha.editarTextos({ nome: nome('Nome novo') });

    expect(campanha.nome.valor).toBe('Nome novo');
    expect(campanha.descricao?.valor).toBe('Descricao original');
  });

  it('does not edit texts of a campaign under review', () => {
    const campanha = CampanhaFactory.create({
      status: CampanhaStatus.EM_ANALISE,
    });

    const result = campanha.editarTextos({ nome: nome('Nome novo') });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(CampanhaEmAnaliseError);
    expect(campanha.status).toBe(CampanhaStatus.EM_ANALISE);
    expect(campanha.nome.valor).toBe('Campanha Teste');
  });

  it('does not edit the commitment of a campaign under review', () => {
    const campanha = CampanhaFactory.create({
      status: CampanhaStatus.EM_ANALISE,
    });

    const result = campanha.editarCompromisso(
      { beneficiada: beneficiada() },
      hoje,
    );

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(CampanhaEmAnaliseError);
    expect(campanha.status).toBe(CampanhaStatus.EM_ANALISE);
    expect(campanha.beneficiada).toBeUndefined();
  });

  it('returns a rejected campaign to draft when its texts are edited, keeping the reason', () => {
    const motivo = 'A descricao nao explica como a doacao e feita';
    const campanha = CampanhaFactory.create({
      status: CampanhaStatus.REJEITADA,
      motivoUltimaRejeicao: motivo,
    });

    const result = campanha.editarTextos({
      descricao: descricao('Descricao corrigida'),
    });

    expect(result.isRight()).toBe(true);
    expect(campanha.status).toBe(CampanhaStatus.RASCUNHO);
    expect(campanha.descricao?.valor).toBe('Descricao corrigida');
    expect(campanha.motivoUltimaRejeicao).toBe(motivo);
  });

  it('returns a rejected campaign to draft when its commitment is edited, keeping the reason', () => {
    const motivo = 'A regra de doacao esta fora do combinado';
    const campanha = CampanhaFactory.create({
      status: CampanhaStatus.REJEITADA,
      motivoUltimaRejeicao: motivo,
    });
    const novaRegra = regraDoacao();

    const result = campanha.editarCompromisso({ regraDoacao: novaRegra }, hoje);

    expect(result.isRight()).toBe(true);
    expect(campanha.status).toBe(CampanhaStatus.RASCUNHO);
    expect(campanha.regraDoacao).toBe(novaRegra);
    expect(campanha.motivoUltimaRejeicao).toBe(motivo);
  });

  it('lists all 4 missing fields at once when submitting an empty draft', () => {
    const campanha = CampanhaFactory.create();

    const result = campanha.submeter(hoje);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(CamposPendentesError);
    expect(campanha.camposPendentes()).toEqual([
      'descricao',
      'beneficiada',
      'regraDoacao',
      'vigencia.inicio',
    ]);
    const mensagem = (result.value as CamposPendentesError).message;
    for (const campo of [
      'descricao',
      'beneficiada',
      'regraDoacao',
      'vigencia.inicio',
    ]) {
      expect(mensagem).toContain(campo);
    }
    expect(campanha.status).toBe(CampanhaStatus.RASCUNHO);
    expect(campanha.submetidaEm).toBeUndefined();
  });

  it('does not submit a campaign whose end date was yesterday', () => {
    const campanha = campanhaCompleta('2026-10-20');

    const result = campanha.submeter(hoje);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(VigenciaVencidaError);
    expect(campanha.status).toBe(CampanhaStatus.RASCUNHO);
    expect(campanha.submetidaEm).toBeUndefined();
  });

  it('does not submit a campaign whose end date is today', () => {
    const campanha = campanhaCompleta('2026-10-21');

    const result = campanha.submeter(hoje);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(VigenciaVencidaError);
    expect(campanha.status).toBe(CampanhaStatus.RASCUNHO);
  });

  it('submits a complete draft and records when', () => {
    const campanha = campanhaCompleta('2026-10-22');

    const result = campanha.submeter(hoje);

    expect(result.isRight()).toBe(true);
    expect(campanha.status).toBe(CampanhaStatus.EM_ANALISE);
    expect(campanha.submetidaEm).toBeInstanceOf(Date);
  });

  it('submits a complete draft without an end date', () => {
    const campanha = campanhaCompleta();

    const result = campanha.submeter(hoje);

    expect(result.isRight()).toBe(true);
    expect(campanha.status).toBe(CampanhaStatus.EM_ANALISE);
  });

  it('does not submit the same campaign twice', () => {
    const campanha = campanhaCompleta();
    campanha.submeter(hoje);
    const submetidaEm = campanha.submetidaEm;

    const result = campanha.submeter(hoje);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(campanha.status).toBe(CampanhaStatus.EM_ANALISE);
    expect(campanha.submetidaEm).toBe(submetidaEm);
  });

  it('approves a campaign under review and records who decided and when', () => {
    const campanha = CampanhaFactory.create({
      status: CampanhaStatus.EM_ANALISE,
    });
    const adminId = new UniqueEntityId();

    const result = campanha.aprovar(adminId);

    expect(result.isRight()).toBe(true);
    expect(campanha.status).toBe(CampanhaStatus.APROVADA);
    expect(campanha.decididoPor).toEqual(adminId);
    expect(campanha.decididoEm).toBeInstanceOf(Date);
  });

  it('rejects a campaign under review and records the reason', () => {
    const campanha = CampanhaFactory.create({
      status: CampanhaStatus.EM_ANALISE,
    });
    const adminId = new UniqueEntityId();
    const motivo = 'A regra de doacao nao esta clara para o consumidor';

    const result = campanha.rejeitar(adminId, motivo);

    expect(result.isRight()).toBe(true);
    expect(campanha.status).toBe(CampanhaStatus.REJEITADA);
    expect(campanha.decididoPor).toEqual(adminId);
    expect(campanha.decididoEm).toBeInstanceOf(Date);
    expect(campanha.motivoUltimaRejeicao).toBe(motivo);
  });

  it('rejects a campaign with a reason of exactly 20 characters', () => {
    const campanha = CampanhaFactory.create({
      status: CampanhaStatus.EM_ANALISE,
    });
    const motivo = 'a'.repeat(20);

    const result = campanha.rejeitar(new UniqueEntityId(), motivo);

    expect(result.isRight()).toBe(true);
    expect(campanha.status).toBe(CampanhaStatus.REJEITADA);
    expect(campanha.motivoUltimaRejeicao).toBe(motivo);
  });

  it('does not reject with 19 characters surrounded by spaces', () => {
    const campanha = CampanhaFactory.create({
      status: CampanhaStatus.EM_ANALISE,
    });

    const result = campanha.rejeitar(
      new UniqueEntityId(),
      `   ${'a'.repeat(19)}   `,
    );

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MotivoInsuficienteError);
    expect(campanha.status).toBe(CampanhaStatus.EM_ANALISE);
    expect(campanha.motivoUltimaRejeicao).toBeUndefined();
  });

  it('does not reject with a reason shorter than 20 characters after trimming', () => {
    const campanha = CampanhaFactory.create({
      status: CampanhaStatus.EM_ANALISE,
    });

    const result = campanha.rejeitar(
      new UniqueEntityId(),
      '   motivo curto      ',
    );

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MotivoInsuficienteError);
    expect(campanha.status).toBe(CampanhaStatus.EM_ANALISE);
    expect(campanha.decididoPor).toBeUndefined();
    expect(campanha.motivoUltimaRejeicao).toBeUndefined();
  });

  it.each([
    CampanhaStatus.RASCUNHO,
    CampanhaStatus.APROVADA,
    CampanhaStatus.REJEITADA,
  ])('does not approve a campaign in %s', (status) => {
    const campanha = CampanhaFactory.create({ status });

    const result = campanha.aprovar(new UniqueEntityId());

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(campanha.status).toBe(status);
  });

  it.each([
    CampanhaStatus.RASCUNHO,
    CampanhaStatus.APROVADA,
    CampanhaStatus.REJEITADA,
  ])('does not reject a campaign in %s', (status) => {
    const campanha = CampanhaFactory.create({ status });

    const result = campanha.rejeitar(
      new UniqueEntityId(),
      'Motivo com mais de vinte caracteres',
    );

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
    expect(campanha.status).toBe(status);
  });

  it.each([
    [CampanhaStatus.RASCUNHO, false],
    [CampanhaStatus.EM_ANALISE, false],
    [CampanhaStatus.APROVADA, true],
    [CampanhaStatus.REJEITADA, false],
  ])('is apt for a seal in %s: %s', (status, esperado) => {
    const campanha = CampanhaFactory.create({ status });

    expect(campanha.estaAptaASelo()).toBe(esperado);
  });

  it.each([
    [CampanhaStatus.RASCUNHO, false],
    [CampanhaStatus.EM_ANALISE, false],
    [CampanhaStatus.APROVADA, true],
    [CampanhaStatus.REJEITADA, false],
  ])('is published in %s: %s', (status, esperado) => {
    const campanha = CampanhaFactory.create({ status });

    expect(campanha.estaPublicada()).toBe(esperado);
  });

  it('returns the current commitment when beneficiary, rule and period are filled', () => {
    const campanha = campanhaCompleta('2026-12-31');

    const compromisso = campanha.compromissoVigente();

    expect(compromisso).toBeInstanceOf(Compromisso);
    expect(compromisso?.beneficiada).toBe(campanha.beneficiada);
    expect(compromisso?.regraDoacao).toBe(campanha.regraDoacao);
    expect(compromisso?.vigencia).toBe(campanha.vigencia);
  });

  it.each(['beneficiada', 'regraDoacao', 'vigencia'] as const)(
    'returns no current commitment when %s is missing',
    (campo) => {
      const campanha = CampanhaFactory.create({
        beneficiada: beneficiada(),
        regraDoacao: regraDoacao(),
        vigencia: vigencia('2026-10-01'),
        [campo]: null,
      });

      expect(campanha.compromissoVigente()).toBeNull();
    },
  );

  describe('approved campaign changes', () => {
    it('applies text edits right away, staying APROVADA and opening no change request', () => {
      const campanha = campanhaAprovada();
      const idPublico = campanha.idPublico;
      const capaArquivoId = new UniqueEntityId();

      const result = campanha.editarTextos({
        nome: nome('Nome novo'),
        descricao: descricao('Descricao nova'),
        capaArquivoId,
        meta: meta('500'),
      });

      expect(result.isRight()).toBe(true);
      expect(campanha.status).toBe(CampanhaStatus.APROVADA);
      expect(campanha.nome.valor).toBe('Nome novo');
      expect(campanha.descricao?.valor).toBe('Descricao nova');
      expect(campanha.capaArquivoId).toEqual(capaArquivoId);
      expect(campanha.meta?.centavos).toBe(50000);
      expect(campanha.alteracaoPendente).toBeFalsy();
      expect(campanha.idPublico).toBe(idPublico);
    });

    it('opens a change request with the merged commitment, keeping the approved one in force', () => {
      const campanha = campanhaAprovada();
      const idPublico = campanha.idPublico;
      const anterior = campanha.compromissoVigente()!;
      const novaBeneficiada = beneficiada();

      const result = campanha.editarCompromisso(
        {
          beneficiada: novaBeneficiada,
        },
        hoje,
      );

      expect(result.isRight()).toBe(true);
      expect(campanha.status).toBe(CampanhaStatus.APROVADA);
      expect(campanha.compromissoVigente()?.equals(anterior)).toBe(true);
      expect(campanha.beneficiada).toBe(anterior.beneficiada);

      const alteracao = campanha.alteracaoPendente!;
      expect(alteracao.status).toBe(AlteracaoStatus.EM_ANALISE);
      expect(alteracao.campanhaId).toEqual(campanha.id);
      expect(alteracao.anterior.equals(anterior)).toBe(true);
      expect(
        alteracao.proposto.equals(
          anterior.mesclar({ beneficiada: novaBeneficiada }),
        ),
      ).toBe(true);
      expect(campanha.idPublico).toBe(idPublico);
    });

    it('does not open a change whose proposed end date is today', () => {
      const campanha = campanhaAprovada();
      const anterior = campanha.compromissoVigente()!;

      const result = campanha.editarCompromisso(
        { vigencia: vigencia('2026-10-01', '2026-10-21') },
        hoje,
      );

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(VigenciaVencidaError);
      expect(campanha.alteracaoPendente).toBeFalsy();
      expect(campanha.compromissoVigente()?.equals(anterior)).toBe(true);
    });

    it('opens a change whose proposed end date is tomorrow', () => {
      const campanha = campanhaAprovada();

      const result = campanha.editarCompromisso(
        { vigencia: vigencia('2026-10-01', '2026-10-22') },
        hoje,
      );

      expect(result.isRight()).toBe(true);
      expect(
        campanha.alteracaoPendente?.proposto.vigencia.fim?.toString(),
      ).toBe('2026-10-22');
    });

    it('does not open a second change request while one is pending', () => {
      const campanha = campanhaAprovada();
      campanha.editarCompromisso({ beneficiada: beneficiada() }, hoje);
      const pendente = campanha.alteracaoPendente;

      const result = campanha.editarCompromisso(
        {
          vigencia: vigencia('2026-11-01', '2027-01-31'),
        },
        hoje,
      );

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(AlteracaoJaPendenteError);
      expect(campanha.alteracaoPendente).toBe(pendente);
    });

    it('still applies text edits while a change request is pending', () => {
      const campanha = campanhaAprovada();
      campanha.editarCompromisso({ beneficiada: beneficiada() }, hoje);
      const pendente = campanha.alteracaoPendente;

      const result = campanha.editarTextos({ nome: nome('Nome novo') });

      expect(result.isRight()).toBe(true);
      expect(campanha.nome.valor).toBe('Nome novo');
      expect(campanha.alteracaoPendente).toBe(pendente);
    });

    it('copies the proposed commitment when the change is approved and clears the pending change', () => {
      const campanha = campanhaAprovada();
      const idPublico = campanha.idPublico;
      const novaRegra = regraDoacao();
      const novaVigencia = vigencia('2026-11-01', '2027-01-31');
      campanha.editarCompromisso(
        {
          regraDoacao: novaRegra,
          vigencia: novaVigencia,
        },
        hoje,
      );
      const alteracao = campanha.alteracaoPendente!;
      const adminId = new UniqueEntityId();

      const result = campanha.aprovarAlteracao(adminId);

      expect(result.isRight()).toBe(true);
      expect(campanha.status).toBe(CampanhaStatus.APROVADA);
      expect(campanha.regraDoacao).toBe(novaRegra);
      expect(campanha.vigencia).toBe(novaVigencia);
      expect(campanha.compromissoVigente()?.equals(alteracao.proposto)).toBe(
        true,
      );
      expect(campanha.alteracaoPendente).toBeNull();
      expect(alteracao.status).toBe(AlteracaoStatus.APROVADA);
      expect(alteracao.decididoPor).toEqual(adminId);
      expect(campanha.idPublico).toBe(idPublico);
    });

    it('keeps the previous commitment when the change is rejected and stores the reason in the change', () => {
      const campanha = campanhaAprovada();
      const idPublico = campanha.idPublico;
      const anterior = campanha.compromissoVigente()!;
      campanha.editarCompromisso({ beneficiada: beneficiada() }, hoje);
      const alteracao = campanha.alteracaoPendente!;
      const adminId = new UniqueEntityId();

      const result = campanha.rejeitarAlteracao(adminId, MOTIVO_ALTERACAO);

      expect(result.isRight()).toBe(true);
      expect(campanha.status).toBe(CampanhaStatus.APROVADA);
      expect(campanha.compromissoVigente()?.equals(anterior)).toBe(true);
      expect(campanha.alteracaoPendente).toBeNull();
      expect(alteracao.status).toBe(AlteracaoStatus.REJEITADA);
      expect(alteracao.motivo).toBe(MOTIVO_ALTERACAO);
      expect(alteracao.decididoPor).toEqual(adminId);
      expect(campanha.motivoUltimaRejeicao).toBeUndefined();
      expect(campanha.idPublico).toBe(idPublico);
    });

    describe('decided change handed to the repository save', () => {
      const agora = new Date('2026-10-21T15:00:00Z');

      beforeEach(() => {
        jest.useFakeTimers({ now: agora });
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('has no decided change while the change is still pending', () => {
        const campanha = campanhaAprovada();

        campanha.editarCompromisso({ beneficiada: beneficiada() }, hoje);

        expect(campanha.alteracaoDecidida).toBeNull();
      });

      it('keeps the approved change reachable with status, who decided and when', () => {
        const campanha = campanhaAprovada();
        campanha.editarCompromisso({ regraDoacao: regraDoacao() }, hoje);
        const alteracao = campanha.alteracaoPendente!;
        const adminId = new UniqueEntityId();

        const result = campanha.aprovarAlteracao(adminId);

        expect(result.isRight()).toBe(true);
        expect(campanha.alteracaoPendente).toBeNull();
        expect(campanha.compromissoVigente()?.equals(alteracao.proposto)).toBe(
          true,
        );
        const decidida = campanha.alteracaoDecidida!;
        expect(decidida.id.equals(alteracao.id)).toBe(true);
        expect(decidida.status).toBe(AlteracaoStatus.APROVADA);
        expect(decidida.decididoPor).toEqual(adminId);
        expect(decidida.decididoEm).toEqual(agora);
        expect(decidida.motivo).toBeUndefined();
      });

      it('keeps the rejected change reachable with status, who decided, when and the reason', () => {
        const campanha = campanhaAprovada();
        const anterior = campanha.compromissoVigente()!;
        campanha.editarCompromisso({ beneficiada: beneficiada() }, hoje);
        const alteracao = campanha.alteracaoPendente!;
        const adminId = new UniqueEntityId();

        const result = campanha.rejeitarAlteracao(adminId, MOTIVO_ALTERACAO);

        expect(result.isRight()).toBe(true);
        expect(campanha.alteracaoPendente).toBeNull();
        expect(campanha.compromissoVigente()?.equals(anterior)).toBe(true);
        const decidida = campanha.alteracaoDecidida!;
        expect(decidida.id.equals(alteracao.id)).toBe(true);
        expect(decidida.status).toBe(AlteracaoStatus.REJEITADA);
        expect(decidida.decididoPor).toEqual(adminId);
        expect(decidida.decididoEm).toEqual(agora);
        expect(decidida.motivo).toBe(MOTIVO_ALTERACAO);
      });

      it('keeps the decided change reachable when a new change is opened afterwards', () => {
        const campanha = campanhaAprovada();
        campanha.editarCompromisso({ beneficiada: beneficiada() }, hoje);
        const primeira = campanha.alteracaoPendente!;
        campanha.rejeitarAlteracao(new UniqueEntityId(), MOTIVO_ALTERACAO);

        const result = campanha.editarCompromisso(
          {
            regraDoacao: regraDoacao(),
          },
          hoje,
        );

        expect(result.isRight()).toBe(true);
        expect(campanha.alteracaoDecidida).toBe(primeira);
        expect(campanha.alteracaoPendente?.status).toBe(
          AlteracaoStatus.EM_ANALISE,
        );
        expect(campanha.alteracaoPendente?.id.equals(primeira.id)).toBe(false);
      });
    });

    it('does not reject the change with a reason shorter than 20 characters', () => {
      const campanha = campanhaAprovada();
      campanha.editarCompromisso({ beneficiada: beneficiada() }, hoje);
      const alteracao = campanha.alteracaoPendente!;

      const result = campanha.rejeitarAlteracao(
        new UniqueEntityId(),
        '   motivo curto      ',
      );

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(MotivoInsuficienteError);
      expect(campanha.alteracaoPendente).toBe(alteracao);
      expect(alteracao.status).toBe(AlteracaoStatus.EM_ANALISE);
      expect(campanha.alteracaoDecidida).toBeNull();
    });

    it('accepts a new change request after the previous one was decided', () => {
      const campanha = campanhaAprovada();
      campanha.editarCompromisso({ beneficiada: beneficiada() }, hoje);
      campanha.rejeitarAlteracao(new UniqueEntityId(), MOTIVO_ALTERACAO);

      const result = campanha.editarCompromisso(
        { regraDoacao: regraDoacao() },
        hoje,
      );

      expect(result.isRight()).toBe(true);
      expect(campanha.alteracaoPendente?.status).toBe(
        AlteracaoStatus.EM_ANALISE,
      );
    });

    it.each([
      ['approve', (c: Campanha) => c.aprovarAlteracao(new UniqueEntityId())],
      [
        'reject',
        (c: Campanha) =>
          c.rejeitarAlteracao(new UniqueEntityId(), MOTIVO_ALTERACAO),
      ],
    ])('does not %s a change when none is pending', (_acao, decidir) => {
      const campanha = campanhaAprovada();
      const anterior = campanha.compromissoVigente()!;

      const result = decidir(campanha);

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(TransicaoInvalidaError);
      expect(campanha.status).toBe(CampanhaStatus.APROVADA);
      expect(campanha.compromissoVigente()?.equals(anterior)).toBe(true);
      expect(campanha.alteracaoDecidida).toBeNull();
    });
  });

  it('has no public setter', () => {
    const descritores = Object.getOwnPropertyDescriptors(Campanha.prototype);

    const setters = Object.entries(descritores)
      .filter(([, descritor]) => descritor.set !== undefined)
      .map(([propriedade]) => propriedade);

    expect(setters).toEqual([]);
  });
});
