import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { CampanhaFactory } from '@test/factories/campanha-factory';
import { CampanhaEmAnaliseError } from '../application/errors/campanha-em-analise.error';
import { CamposPendentesError } from '../application/errors/campos-pendentes.error';
import { MotivoInsuficienteError } from '../application/errors/motivo-insuficiente.error';
import { TransicaoInvalidaError } from '../application/errors/transicao-invalida.error';
import { VigenciaVencidaError } from '../application/errors/vigencia-vencida.error';
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

    const result = campanha.editarCompromisso({
      beneficiada: novaBeneficiada,
      regraDoacao: novaRegra,
      vigencia: novaVigencia,
    });

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

    const result = campanha.editarCompromisso({ beneficiada: beneficiada() });

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

    const result = campanha.editarCompromisso({ regraDoacao: novaRegra });

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

  it('has no public setter', () => {
    const descritores = Object.getOwnPropertyDescriptors(Campanha.prototype);

    const setters = Object.entries(descritores)
      .filter(([, descritor]) => descritor.set !== undefined)
      .map(([propriedade]) => propriedade);

    expect(setters).toEqual([]);
  });
});
