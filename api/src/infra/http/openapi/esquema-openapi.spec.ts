import { z } from 'zod';

import { criarEmpresaSchema } from '../cadastro-empresa.dto';
import {
  componentesOpenApi,
  ERRO_RESPOSTA,
  esquemaOpenApi,
} from './esquema-openapi';

type Esquema = {
  required?: string[];
  properties: Record<string, Record<string, unknown>>;
};

describe('esquemaOpenApi', () => {
  it('marca como obrigatórios só os campos obrigatórios do esquema Zod e carrega as restrições', () => {
    const ref = esquemaOpenApi('CriarEmpresa', criarEmpresaSchema);
    const esquema = componentesOpenApi().CriarEmpresa as Esquema;

    expect(ref).toEqual({ $ref: '#/components/schemas/CriarEmpresa' });
    expect(esquema.required).toEqual(
      expect.arrayContaining(['razaoSocial', 'cnpj', 'email', 'senha', 'uf']),
    );
    expect(esquema.required).not.toContain('complemento');
    expect(esquema.required).not.toContain('site');
    expect(esquema.properties.uf.minLength).toBe(2);
    expect(esquema.properties.uf.maxLength).toBe(2);
  });

  it('registra ErroResposta com statusCode inteiro e message string obrigatórios', () => {
    const esquema = componentesOpenApi().ErroResposta as Esquema;

    expect(ERRO_RESPOSTA).toEqual({
      $ref: '#/components/schemas/ErroResposta',
    });
    expect(esquema.required).toEqual(
      expect.arrayContaining(['statusCode', 'message']),
    );
    expect(esquema.properties.statusCode.type).toBe('integer');
    expect(esquema.properties.message.type).toBe('string');
  });

  it('não duplica o componente ao registrar duas vezes o mesmo nome', () => {
    esquemaOpenApi('Repetido', z.object({ a: z.string() }));
    esquemaOpenApi('Repetido', z.object({ b: z.string() }));

    const nomes = Object.keys(componentesOpenApi()).filter(
      (nome) => nome === 'Repetido',
    );

    expect(nomes).toHaveLength(1);
    expect((componentesOpenApi().Repetido as Esquema).required).toEqual(['b']);
  });
});
