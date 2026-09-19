import { Logger } from '@nestjs/common';

import { EmailPendenteService } from './email-pendente.service';
import { EmailPendenteWorker } from './email-pendente.worker';

/** Dreno controlado: cada `drenar` só termina quando o teste manda. */
class EmailPendenteServiceFalso {
  public chamadas = 0;
  public falhar = false;
  private resolver?: (entregues: number) => void;

  drenar(): Promise<number> {
    this.chamadas += 1;

    if (this.falhar) {
      return Promise.reject(new Error('provedor de e-mail indisponível'));
    }

    return new Promise<number>((resolve) => {
      this.resolver = resolve;
    });
  }

  concluir(entregues = 0): void {
    this.resolver?.(entregues);
  }
}

function criarWorker(): {
  worker: EmailPendenteWorker;
  fila: EmailPendenteServiceFalso;
} {
  const fila = new EmailPendenteServiceFalso();
  const worker = new EmailPendenteWorker(
    fila as unknown as EmailPendenteService,
  );

  return { worker, fila };
}

describe('EmailPendenteWorker', () => {
  it('drains the queue once per executar()', async () => {
    const { worker, fila } = criarWorker();

    const execucao = worker.executar();
    fila.concluir();
    await execucao;

    expect(fila.chamadas).toBe(1);
  });

  it('drains only once when a second executar() overlaps the first', async () => {
    const { worker, fila } = criarWorker();

    const primeira = worker.executar();
    const segunda = worker.executar();

    await segunda;
    expect(fila.chamadas).toBe(1);

    fila.concluir();
    await primeira;
    expect(fila.chamadas).toBe(1);
  });

  it('logs and swallows a failing drain, and drains again on the next call', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const { worker, fila } = criarWorker();
    fila.falhar = true;

    await expect(worker.executar()).resolves.toBeUndefined();

    expect(fila.chamadas).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      'Falha ao drenar a fila de e-mail',
      expect.any(Error),
    );

    fila.falhar = false;
    const seguinte = worker.executar();
    expect(fila.chamadas).toBe(2);

    fila.concluir();
    await seguinte;

    errorSpy.mockRestore();
  });

  it('schedules nothing on onModuleInit when NODE_ENV is test', () => {
    const anterior = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const { worker } = criarWorker();

    try {
      worker.onModuleInit();

      expect(setIntervalSpy).not.toHaveBeenCalled();
    } finally {
      worker.onModuleDestroy();
      setIntervalSpy.mockRestore();
      process.env.NODE_ENV = anterior;
    }
  });
});
