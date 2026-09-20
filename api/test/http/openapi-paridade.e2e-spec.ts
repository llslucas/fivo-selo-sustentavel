import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import {
  DiscoveryModule,
  DiscoveryService,
  MetadataScanner,
  Reflector,
} from '@nestjs/core';
import request from 'supertest';

import { IS_PUBLIC_KEY } from '@infra/auth/public.decorator';
import {
  AppDeTeste,
  criarAppDeTeste,
  servidorHttp,
} from '@test/helpers/e2e-app';

interface RotaRegistrada {
  chave: string;
  publica: boolean;
}

interface Operacao {
  security?: unknown[];
  responses: Record<string, unknown>;
}

const METODOS_HTTP: Partial<Record<RequestMethod, string>> = {
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.DELETE]: 'delete',
};

function juntarCaminho(...partes: string[]): string {
  const caminho = partes
    .flatMap((parte) => parte.split('/'))
    .filter((parte) => parte !== '')
    .map((parte) => parte.replace(/^:(.+)$/, '{$1}'))
    .join('/');

  return `/${caminho}`;
}

function rotasRegistradas(contexto: AppDeTeste): RotaRegistrada[] {
  const descoberta = contexto.app.get(DiscoveryService);
  const varredor = contexto.app.get(MetadataScanner);
  const refletor = contexto.app.get(Reflector);
  const rotas: RotaRegistrada[] = [];

  for (const { metatype, instance } of descoberta.getControllers()) {
    if (!metatype || !instance) {
      continue;
    }

    const caminhoBase = Reflect.getMetadata(PATH_METADATA, metatype) as string;
    const prototipo = Object.getPrototypeOf(instance) as object;

    for (const nome of varredor.getAllMethodNames(prototipo)) {
      const handler = (prototipo as Record<string, () => unknown>)[nome];
      const metodo = Reflect.getMetadata(METHOD_METADATA, handler) as
        RequestMethod | undefined;

      if (metodo === undefined) {
        continue;
      }

      const caminhoRota = Reflect.getMetadata(PATH_METADATA, handler) as string;
      const publica =
        refletor.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
          handler,
          metatype,
        ]) === true;

      rotas.push({
        chave: `${METODOS_HTTP[metodo]} ${juntarCaminho(caminhoBase, caminhoRota)}`,
        publica,
      });
    }
  }

  return rotas;
}

describe('Paridade rotas registradas ↔ documento OpenAPI (e2e)', () => {
  let contexto: AppDeTeste;
  let rotas: RotaRegistrada[];
  let operacoes: Map<string, Operacao>;

  beforeAll(async () => {
    contexto = await criarAppDeTeste({ imports: [DiscoveryModule] });
    rotas = rotasRegistradas(contexto);

    const resposta = await request(servidorHttp(contexto)).get(
      '/docs/openapi.json',
    );
    const paths = (
      resposta.body as { paths: Record<string, Record<string, Operacao>> }
    ).paths;

    operacoes = new Map(
      Object.entries(paths).flatMap(([caminho, porMetodo]) =>
        Object.entries(porMetodo).map(
          ([metodo, operacao]) => [`${metodo} ${caminho}`, operacao] as const,
        ),
      ),
    );
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('as 15 rotas registradas são exatamente as 15 operações documentadas', () => {
    const registradas = rotas.map((rota) => rota.chave).sort();
    const documentadas = [...operacoes.keys()].sort();

    expect(registradas).toHaveLength(15);
    expect(documentadas).toEqual(registradas);
  });

  it('toda operação documentada tem ao menos uma resposta 2xx', () => {
    for (const [chave, operacao] of operacoes) {
      const codigos = Object.keys(operacao.responses);

      expect([chave, codigos.some((codigo) => codigo.startsWith('2'))]).toEqual(
        [chave, true],
      );
    }
  });

  it('rotas @Public não têm security; as demais têm', () => {
    for (const rota of rotas) {
      const operacao = operacoes.get(rota.chave);

      expect([rota.chave, operacao?.security !== undefined]).toEqual([
        rota.chave,
        !rota.publica,
      ]);
    }
  });
});
