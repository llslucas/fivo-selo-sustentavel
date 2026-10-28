import { Either } from '@core/either';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import {
  MotivoInsuficienteError,
  TransicaoInvalidaError,
} from '@domain/fivo/shared';
import { AlteracaoCompromisso, AlteracaoStatus } from './alteracao-compromisso';
import { Beneficiada } from '@domain/fivo/catalogo';
import { Compromisso } from './compromisso';
import { DataCalendario } from './data-calendario';
import { RegraDoacao, TipoRegraDoacao } from './regra-doacao';
import { Vigencia } from './vigencia';

function valor<E, T>(resultado: Either<E, T>): T {
  if (resultado.isLeft()) {
    throw new Error('Esperava um valor válido, mas recebeu um erro');
  }

  return resultado.value;
}

function compromisso(instituicaoId: string, valorRegra: string): Compromisso {
  return Compromisso.criar({
    beneficiada: valor(Beneficiada.criar({ instituicaoId })),
    regraDoacao: valor(
      RegraDoacao.criar({
        tipo: TipoRegraDoacao.POR_UNIDADE,
        valor: valorRegra,
      }),
    ),
    vigencia: valor(
      Vigencia.criar({
        inicio: valor(DataCalendario.criar('2026-01-10')),
        fim: valor(DataCalendario.criar('2026-12-31')),
      }),
    ),
  });
}

const MOTIVO_20 = 'a'.repeat(20);
const MOTIVO_19 = 'a'.repeat(19);

describe('AlteracaoCompromisso Entity', () => {
  const agora = new Date('2026-10-25T12:00:00.000Z');
  const adminId = new UniqueEntityId('admin-1');
  const campanhaId = new UniqueEntityId('campanha-1');
  let anterior: Compromisso;
  let proposto: Compromisso;
  let alteracao: AlteracaoCompromisso;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(agora);

    anterior = compromisso('instituicao-1', '1.00');
    proposto = compromisso('instituicao-2', '2.00');
    alteracao = AlteracaoCompromisso.create({ campanhaId, proposto, anterior });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('nasce EM_ANALISE, com os compromissos proposto e anterior e sem decisão', () => {
      expect(alteracao.status).toBe(AlteracaoStatus.EM_ANALISE);
      expect(alteracao.campanhaId).toBe(campanhaId);
      expect(alteracao.proposto).toBe(proposto);
      expect(alteracao.anterior).toBe(anterior);
      expect(alteracao.createdAt).toEqual(agora);
      expect(alteracao.decididoPor).toBeFalsy();
      expect(alteracao.decididoEm).toBeFalsy();
      expect(alteracao.motivo).toBeFalsy();
    });
  });

  describe('aprovar', () => {
    it('em EM_ANALISE, passa para APROVADA e registra quem decidiu e quando', () => {
      const resultado = alteracao.aprovar(adminId);

      expect(resultado.isRight()).toBe(true);
      expect(alteracao.status).toBe(AlteracaoStatus.APROVADA);
      expect(alteracao.decididoPor).toBe(adminId);
      expect(alteracao.decididoEm).toEqual(agora);
      expect(alteracao.motivo).toBeFalsy();
    });

    it('uma segunda vez devolve TransicaoInvalidaError e não muda o estado', () => {
      alteracao.aprovar(adminId);
      const outroAdmin = new UniqueEntityId('admin-2');
      jest.setSystemTime(new Date('2026-10-26T12:00:00.000Z'));

      const resultado = alteracao.aprovar(outroAdmin);

      expect(resultado.isLeft()).toBe(true);
      expect(resultado.value).toBeInstanceOf(TransicaoInvalidaError);
      expect(alteracao.status).toBe(AlteracaoStatus.APROVADA);
      expect(alteracao.decididoPor).toBe(adminId);
      expect(alteracao.decididoEm).toEqual(agora);
    });

    it('depois de REJEITADA devolve TransicaoInvalidaError e não muda o estado', () => {
      alteracao.rejeitar(adminId, MOTIVO_20);

      const resultado = alteracao.aprovar(new UniqueEntityId('admin-2'));

      expect(resultado.isLeft()).toBe(true);
      expect(resultado.value).toBeInstanceOf(TransicaoInvalidaError);
      expect(alteracao.status).toBe(AlteracaoStatus.REJEITADA);
      expect(alteracao.decididoPor).toBe(adminId);
      expect(alteracao.motivo).toBe(MOTIVO_20);
    });
  });

  describe('rejeitar', () => {
    it('com motivo de exatamente 20 caracteres passa para REJEITADA e grava decisão e motivo', () => {
      const resultado = alteracao.rejeitar(adminId, MOTIVO_20);

      expect(resultado.isRight()).toBe(true);
      expect(alteracao.status).toBe(AlteracaoStatus.REJEITADA);
      expect(alteracao.decididoPor).toBe(adminId);
      expect(alteracao.decididoEm).toEqual(agora);
      expect(alteracao.motivo).toBe(MOTIVO_20);
    });

    it('com motivo de 19 caracteres devolve MotivoInsuficienteError e continua EM_ANALISE', () => {
      const resultado = alteracao.rejeitar(adminId, MOTIVO_19);

      expect(resultado.isLeft()).toBe(true);
      expect(resultado.value).toBeInstanceOf(MotivoInsuficienteError);
      expect(alteracao.status).toBe(AlteracaoStatus.EM_ANALISE);
      expect(alteracao.decididoPor).toBeFalsy();
      expect(alteracao.decididoEm).toBeFalsy();
      expect(alteracao.motivo).toBeFalsy();
    });

    it('conta o motivo sem os espaços das pontas: 19 caracteres com espaços em volta é recusado', () => {
      const resultado = alteracao.rejeitar(adminId, `   ${MOTIVO_19}   `);

      expect(resultado.isLeft()).toBe(true);
      expect(resultado.value).toBeInstanceOf(MotivoInsuficienteError);
      expect(alteracao.status).toBe(AlteracaoStatus.EM_ANALISE);
      expect(alteracao.motivo).toBeFalsy();
    });

    it('uma segunda vez devolve TransicaoInvalidaError e não muda o estado', () => {
      alteracao.rejeitar(adminId, MOTIVO_20);
      const outroMotivo = 'b'.repeat(30);

      const resultado = alteracao.rejeitar(
        new UniqueEntityId('admin-2'),
        outroMotivo,
      );

      expect(resultado.isLeft()).toBe(true);
      expect(resultado.value).toBeInstanceOf(TransicaoInvalidaError);
      expect(alteracao.status).toBe(AlteracaoStatus.REJEITADA);
      expect(alteracao.decididoPor).toBe(adminId);
      expect(alteracao.motivo).toBe(MOTIVO_20);
    });

    it('depois de APROVADA devolve TransicaoInvalidaError e não muda o estado', () => {
      alteracao.aprovar(adminId);

      const resultado = alteracao.rejeitar(
        new UniqueEntityId('admin-2'),
        MOTIVO_20,
      );

      expect(resultado.isLeft()).toBe(true);
      expect(resultado.value).toBeInstanceOf(TransicaoInvalidaError);
      expect(alteracao.status).toBe(AlteracaoStatus.APROVADA);
      expect(alteracao.decididoPor).toBe(adminId);
      expect(alteracao.motivo).toBeFalsy();
    });
  });

  describe('encapsulamento', () => {
    it.each([
      'campanhaId',
      'proposto',
      'anterior',
      'status',
      'createdAt',
      'decididoPor',
      'decididoEm',
      'motivo',
    ])('não expõe setter público para %s', (campo) => {
      const alvo = alteracao as unknown as Record<string, unknown>;
      const antes = alvo[campo];

      expect(() => {
        alvo[campo] = 'valor-forjado';
      }).toThrow(TypeError);
      expect(alvo[campo]).toBe(antes);
    });
  });
});
