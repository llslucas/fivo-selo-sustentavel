import { randomUUID } from 'node:crypto';

import { RegistroAuditoriaRepository } from '@domain/fivo/application/ports/registro-auditoria-repository';
import { PrismaRegistroAuditoriaRepository } from '@infra/database/prisma/prisma-registro-auditoria-repository';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

describe('PrismaRegistroAuditoriaRepository (e2e)', () => {
  let contexto: AppDeTeste;
  let repository: RegistroAuditoriaRepository;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    repository = contexto.app.get(RegistroAuditoriaRepository);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('registrar persiste a linha de auditoria com todos os campos', async () => {
    const registro = {
      id: randomUUID(),
      tipo: 'EMPRESA_APROVADA',
      descricao: 'Empresa aprovada pelo administrador',
      usuarioId: randomUUID(),
      entidadeId: randomUUID(),
      dados: { de: 'PENDENTE_APROVACAO', para: 'APROVADA' },
      criadoEm: new Date('2026-02-03T08:00:00.000Z'),
    };

    await repository.registrar(registro);

    const linha = await contexto.prisma.registroAuditoria.findUniqueOrThrow({
      where: { id: registro.id },
    });

    expect(linha.tipo).toBe('EMPRESA_APROVADA');
    expect(linha.descricao).toBe('Empresa aprovada pelo administrador');
    expect(linha.usuarioId).toBe(registro.usuarioId);
    expect(linha.entidadeId).toBe(registro.entidadeId);
    expect(linha.dados).toEqual({
      de: 'PENDENTE_APROVACAO',
      para: 'APROVADA',
    });
    expect(linha.criadoEm.getTime()).toBe(registro.criadoEm.getTime());
  });

  it('registrar aceita os campos opcionais ausentes', async () => {
    const registro = {
      id: randomUUID(),
      tipo: 'LOGIN_FALHOU',
      descricao: 'Tentativa de login sem usuário conhecido',
      criadoEm: new Date('2026-02-03T09:00:00.000Z'),
    };

    await repository.registrar(registro);

    const linha = await contexto.prisma.registroAuditoria.findUniqueOrThrow({
      where: { id: registro.id },
    });

    expect(linha.usuarioId).toBeNull();
    expect(linha.entidadeId).toBeNull();
    expect(linha.dados).toBeNull();
  });

  it('não expõe nenhum método de alteração ou remoção (append-only)', () => {
    const metodos = Object.getOwnPropertyNames(
      PrismaRegistroAuditoriaRepository.prototype,
    ).filter((nome) => nome !== 'constructor');

    expect(metodos).toEqual(['registrar']);
  });
});
