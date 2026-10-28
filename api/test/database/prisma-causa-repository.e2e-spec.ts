import { CausaJaExisteError } from '@domain/fivo/catalogo/errors/causa-ja-existe.error';
import { CausaRepository } from '@domain/fivo/catalogo/ports/causa-repository';
import { CausaStatus } from '@domain/fivo/catalogo/entities/causa';
import { CausaFactory } from '@test/factories/causa-factory';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';

describe('PrismaCausaRepository (e2e)', () => {
  let contexto: AppDeTeste;
  let repository: CausaRepository;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
    repository = contexto.app.get(CausaRepository);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('create seguido de findById devolve uma entidade equivalente', async () => {
    const causa = CausaFactory.create({
      nome: 'Educação',
      descricao: 'Projetos de alfabetização e reforço escolar.',
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-02T10:00:00.000Z'),
    });

    await repository.create(causa);

    const encontrada = await repository.findById(causa.id.toString());

    expect(encontrada).not.toBeNull();
    expect(encontrada!.equals(causa)).toBe(true);
    expect(encontrada!.nome).toBe('Educação');
    expect(encontrada!.descricao).toBe(
      'Projetos de alfabetização e reforço escolar.',
    );
    expect(encontrada!.status).toBe(CausaStatus.ATIVA);
    expect(encontrada!.createdAt.getTime()).toBe(
      new Date('2026-05-01T10:00:00.000Z').getTime(),
    );
    expect(encontrada!.updatedAt?.getTime()).toBe(
      new Date('2026-05-02T10:00:00.000Z').getTime(),
    );
  });

  it('findById devolve null quando a causa não existe', async () => {
    await expect(repository.findById('causa-inexistente')).resolves.toBeNull();
  });

  it('grava nome_busca em minúsculas e sem acento', async () => {
    const causa = CausaFactory.create({ nome: 'Saúde Mental Infantil' });

    await repository.create(causa);

    const linha = await contexto.prisma.causa.findUnique({
      where: { id: causa.id.toString() },
    });
    expect(linha!.nome).toBe('Saúde Mental Infantil');
    expect(linha!.nomeBusca).toBe('saude mental infantil');
  });

  it('findByNome encontra "Educação" buscando "educacao" e "EDUCAÇÃO"', async () => {
    const causa = CausaFactory.create({ nome: 'Educação' });
    await repository.create(causa);

    const semAcento = await repository.findByNome('educacao');
    const maiusculas = await repository.findByNome('EDUCAÇÃO');

    expect(semAcento?.id.toString()).toBe(causa.id.toString());
    expect(semAcento?.nome).toBe('Educação');
    expect(maiusculas?.id.toString()).toBe(causa.id.toString());
  });

  it('findByNome devolve null quando nenhum nome normalizado bate', async () => {
    await repository.create(CausaFactory.create({ nome: 'Educação' }));

    await expect(repository.findByNome('Educa')).resolves.toBeNull();
  });

  it('listarAtivas devolve só as causas ATIVA', async () => {
    const educacao = CausaFactory.create({ nome: 'Educação' });
    const saude = CausaFactory.create({ nome: 'Saúde' });
    const inativa = CausaFactory.create({
      nome: 'Cultura',
      status: CausaStatus.INATIVA,
    });

    await repository.create(educacao);
    await repository.create(saude);
    await repository.create(inativa);

    const ativas = await repository.listarAtivas();

    expect(ativas.map((causa) => causa.nome).sort()).toEqual([
      'Educação',
      'Saúde',
    ]);
    expect(ativas.every((causa) => causa.status === CausaStatus.ATIVA)).toBe(
      true,
    );
  });

  it('save persiste edição e inativação e recalcula nome_busca', async () => {
    const causa = CausaFactory.create({
      nome: 'Educação',
      descricao: 'Descrição antiga',
    });
    await repository.create(causa);
    const lida = (await repository.findById(causa.id.toString()))!;

    lida.editar('Meio Ambiente', 'Descrição nova');
    lida.inativar();
    await repository.save(lida);

    const final = await repository.findById(causa.id.toString());
    expect(final!.nome).toBe('Meio Ambiente');
    expect(final!.descricao).toBe('Descrição nova');
    expect(final!.status).toBe(CausaStatus.INATIVA);
    const linha = await contexto.prisma.causa.findUnique({
      where: { id: causa.id.toString() },
    });
    expect(linha!.nomeBusca).toBe('meio ambiente');
  });

  it('create com nome repetido, mesmo com outra caixa e sem acento, falha com CausaJaExisteError (409)', async () => {
    await repository.create(CausaFactory.create({ nome: 'Educação' }));
    const repetida = CausaFactory.create({ nome: 'EDUCACAO' });

    await expect(repository.create(repetida)).rejects.toBeInstanceOf(
      CausaJaExisteError,
    );
    await expect(repository.create(repetida)).rejects.toMatchObject({
      status: 409,
      message: 'Causa já cadastrada',
    });
    expect(await contexto.prisma.causa.count()).toBe(1);
  });

  it('save que renomeia para um nome já usado falha com CausaJaExisteError (409)', async () => {
    await repository.create(CausaFactory.create({ nome: 'Educação' }));
    const saude = CausaFactory.create({ nome: 'Saúde' });
    await repository.create(saude);
    const lida = (await repository.findById(saude.id.toString()))!;

    lida.editar('educacao', 'Outra descrição');

    await expect(repository.save(lida)).rejects.toMatchObject({
      status: 409,
      message: 'Causa já cadastrada',
    });
    const intacta = await repository.findById(saude.id.toString());
    expect(intacta!.nome).toBe('Saúde');
  });
});
