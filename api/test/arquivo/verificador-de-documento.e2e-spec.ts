import { randomUUID } from 'node:crypto';

import { Storage } from '@domain/fivo/shared/ports/storage';
import { VerificadorDeDocumento } from '@domain/fivo/catalogo/ports/verificador-de-documento';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { FakeStorage } from '@test/doubles/fake-storage';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

const PDF = Buffer.concat([
  Buffer.from('%PDF-1.7\n', 'ascii'),
  Buffer.alloc(512),
]);

describe('VerificadorDeDocumento (e2e)', () => {
  let contexto: AppDeTeste;
  let verificador: VerificadorDeDocumento;
  const storage = new FakeStorage();

  async function enviarDocumento(): Promise<string> {
    const resultado = await contexto.app.get(ArquivoService).uploadDocumento({
      nomeOriginal: 'estatuto.pdf',
      buffer: PDF,
    });

    if (resultado.isLeft()) {
      throw new Error(resultado.value.message);
    }

    return resultado.value.id;
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste({
      configurar: (construtor) =>
        construtor.overrideProvider(Storage).useValue(storage),
    });
    verificador = contexto.app.get(VerificadorDeDocumento);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    storage.arquivos.clear();
    storage.resetFailure();
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('devolve true quando o registro existe e o storage entrega os bytes', async () => {
    const documentoId = await enviarDocumento();

    await expect(verificador.estaLegivel(documentoId)).resolves.toBe(true);
  });

  it('devolve false quando o registro do arquivo não existe', async () => {
    await expect(verificador.estaLegivel(randomUUID())).resolves.toBe(false);
  });

  it('devolve false quando o storage falha na leitura', async () => {
    const documentoId = await enviarDocumento();
    storage.forceFailure();

    await expect(verificador.estaLegivel(documentoId)).resolves.toBe(false);
  });

  it('devolve false quando o objeto sumiu do storage, mesmo com o registro presente', async () => {
    const documentoId = await enviarDocumento();
    storage.arquivos.clear();

    await expect(verificador.estaLegivel(documentoId)).resolves.toBe(false);
    expect(
      await contexto.prisma.arquivo.count({ where: { id: documentoId } }),
    ).toBe(1);
  });
});
