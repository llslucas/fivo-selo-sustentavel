import { DataInvalidaError } from '../errors/data-invalida.error';
import { DataCalendario } from './data-calendario';

describe('DataCalendario Value Object', () => {
  describe('criar', () => {
    it('deve aceitar uma data válida no formato AAAA-MM-DD', () => {
      const result = DataCalendario.criar('2026-10-15');

      if (result.isLeft()) {
        throw new Error('Esperava uma data válida, mas recebeu um erro');
      }

      expect(result.isRight()).toBe(true);
      expect(result.value.valor).toBe('2026-10-15');
    });

    it('deve recusar um formato diferente de AAAA-MM-DD', () => {
      const result = DataCalendario.criar('15/10/2026');

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(DataInvalidaError);
    });

    it('deve recusar dia inexistente (30 de fevereiro)', () => {
      const result = DataCalendario.criar('2026-02-30');

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(DataInvalidaError);
    });

    it('deve recusar mês inexistente (mês 13)', () => {
      const result = DataCalendario.criar('2026-13-01');

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(DataInvalidaError);
    });

    it('deve aceitar o último dia válido de fevereiro em ano não bissexto (2026-02-28)', () => {
      const result = DataCalendario.criar('2026-02-28');

      if (result.isLeft()) {
        throw new Error('Esperava uma data válida, mas recebeu um erro');
      }

      expect(result.isRight()).toBe(true);
      expect(result.value.valor).toBe('2026-02-28');
    });

    it('deve recusar o dia seguinte ao último válido de fevereiro em ano não bissexto (2026-02-29)', () => {
      const result = DataCalendario.criar('2026-02-29');

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(DataInvalidaError);
    });

    it('deve devolver DataInvalidaError com status 422 e a mensagem definida', () => {
      const result = DataCalendario.criar('data-invalida');

      expect(result.isLeft()).toBe(true);

      if (result.isLeft()) {
        expect(result.value.status).toBe(422);
        expect(result.value.message).toBe(
          'Data inválida. Use o formato AAAA-MM-DD',
        );
      }
    });
  });

  describe('hojeEm', () => {
    it('devolve o dia anterior quando ainda é madrugada em UTC mas já virou o dia seguinte em Brasília', () => {
      // 02:30 UTC de 16/10 = 23:30 de 15/10 em São Paulo (UTC-3)
      const agora = new Date('2026-10-16T02:30:00.000Z');

      const hoje = DataCalendario.hojeEm(agora);

      expect(hoje.valor).toBe('2026-10-15');
    });

    it('devolve o mesmo dia UTC quando já passou da meia-noite em Brasília', () => {
      const agora = new Date('2026-10-16T12:00:00.000Z');

      const hoje = DataCalendario.hojeEm(agora);

      expect(hoje.valor).toBe('2026-10-16');
    });
  });

  describe('comparações', () => {
    function criarOuFalha(texto: string): DataCalendario {
      const result = DataCalendario.criar(texto);

      if (result.isLeft()) {
        throw new Error(`Data inesperadamente inválida nos testes: ${texto}`);
      }

      return result.value;
    }

    it('ehAnteriorA retorna true quando a data é anterior e false no sentido contrário', () => {
      const antes = criarOuFalha('2026-10-15');
      const depois = criarOuFalha('2026-10-16');

      expect(antes.ehAnteriorA(depois)).toBe(true);
      expect(depois.ehAnteriorA(antes)).toBe(false);
    });

    it('ehPosteriorA retorna true quando a data é posterior e false no sentido contrário', () => {
      const antes = criarOuFalha('2026-10-15');
      const depois = criarOuFalha('2026-10-16');

      expect(depois.ehPosteriorA(antes)).toBe(true);
      expect(antes.ehPosteriorA(depois)).toBe(false);
    });

    it('ehAnteriorA e ehPosteriorA retornam false para datas iguais', () => {
      const a = criarOuFalha('2026-10-15');
      const b = criarOuFalha('2026-10-15');

      expect(a.ehAnteriorA(b)).toBe(false);
      expect(a.ehPosteriorA(b)).toBe(false);
    });

    it('equals retorna true para datas iguais e false para diferentes', () => {
      const a = criarOuFalha('2026-10-15');
      const b = criarOuFalha('2026-10-15');
      const c = criarOuFalha('2026-10-16');

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it('toString devolve o texto no formato AAAA-MM-DD', () => {
      const data = criarOuFalha('2026-10-15');

      expect(data.toString()).toBe('2026-10-15');
    });
  });
});
