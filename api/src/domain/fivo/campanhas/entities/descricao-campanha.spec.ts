import { DescricaoCampanhaInvalidaError } from '../errors/descricao-campanha-invalida.error';
import { DescricaoCampanha } from './descricao-campanha';

describe('DescricaoCampanha Value Object', () => {
  it('deve aceitar uma descrição com exatos 2000 caracteres', () => {
    const texto = 'a'.repeat(2000);

    const result = DescricaoCampanha.criar(texto);

    if (result.isLeft()) {
      throw new Error('Esperava uma descrição válida, mas recebeu um erro');
    }

    expect(result.isRight()).toBe(true);
    expect(result.value.valor).toBe(texto);
    expect(result.value.valor.length).toBe(2000);
  });

  it('deve recusar uma descrição com 2001 caracteres com a mensagem da T1', () => {
    const texto = 'a'.repeat(2001);

    const result = DescricaoCampanha.criar(texto);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(DescricaoCampanhaInvalidaError);

    if (result.isLeft()) {
      expect(result.value.status).toBe(422);
      expect(result.value.message).toBe(
        'A descrição deve ter no máximo 2000 caracteres',
      );
    }
  });

  it('deve aceitar e devolver conteúdo com HTML/script exatamente igual', () => {
    const texto = '<script>alert(1)</script>';

    const result = DescricaoCampanha.criar(texto);

    if (result.isLeft()) {
      throw new Error('Esperava uma descrição válida, mas recebeu um erro');
    }

    expect(result.isRight()).toBe(true);
    expect(result.value.valor).toBe('<script>alert(1)</script>');
  });
});
