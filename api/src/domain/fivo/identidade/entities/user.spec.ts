import { UserFactory } from '@test/factories/user-factory';

describe('User Login -> registrarFalhaDeLogin', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should increment falhasLogin and set primeiraFalhaEm if null', () => {
    const user = UserFactory.create({ falhasLogin: 0, primeiraFalhaEm: null });

    const agora = new Date();
    user.registrarFalhaDeLogin(agora);

    expect(user.falhasLogin).toBe(1);
    expect(user.primeiraFalhaEm).toEqual(agora);
  });

  it('should increment falhasLogin and not change primeiraFalhaEm if already set', () => {
    const primeiraFalha = new Date();
    const user = UserFactory.create({
      falhasLogin: 1,
      primeiraFalhaEm: primeiraFalha,
    });

    const agora = new Date();
    user.registrarFalhaDeLogin(agora);

    expect(user.falhasLogin).toBe(2);
    expect(user.primeiraFalhaEm).toEqual(primeiraFalha);
  });

  it('should set bloqueadoAte to 15 minutes from now if falhasLogin reaches 5', () => {
    const user = UserFactory.create({
      falhasLogin: 4,
      primeiraFalhaEm: new Date(),
    });

    const agora = new Date();
    user.registrarFalhaDeLogin(agora);

    expect(user.falhasLogin).toBe(5);
    expect(user.bloqueadoAte).toEqual(
      new Date(agora.getTime() + 15 * 60 * 1000),
    );
  });

  it('should reset falhasLogin and primeiraFalhaEm if more than 15 minutes have passed since primeiraFalhaEm', () => {
    const primeiraFalha = new Date();
    const user = UserFactory.create({
      falhasLogin: 3,
      primeiraFalhaEm: primeiraFalha,
    });

    const agora = new Date(new Date(primeiraFalha).getTime() + 16 * 60 * 1000); // 16 minutos depois
    user.registrarFalhaDeLogin(agora);

    expect(user.falhasLogin).toBe(1);
    expect(user.primeiraFalhaEm).toEqual(agora);
  });
});

describe('User Login -> estaBloqueado', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return true if user is currently blocked', () => {
    const bloqueadoAte = new Date(new Date().getTime() + 10 * 60 * 1000); // 10 minutos no futuro
    const user = UserFactory.create({ bloqueadoAte });

    const agora = new Date();
    expect(user.estaBloqueado(agora)).toBe(true);
  });

  it('should return false if user is not blocked', () => {
    const user = UserFactory.create({ bloqueadoAte: null });

    const agora = new Date();
    expect(user.estaBloqueado(agora)).toBe(false);
  });

  it('should return false if bloqueadoAte is in the past', () => {
    const bloqueadoAte = new Date(new Date().getTime() - 16 * 60 * 1000); // 16 minutos no passado
    const user = UserFactory.create({ bloqueadoAte });

    const agora = new Date();
    expect(user.estaBloqueado(agora)).toBe(false);
  });

  it('should return false the instant bloqueadoAte has just passed', () => {
    const bloqueadoAte = new Date();
    const user = UserFactory.create({ bloqueadoAte });

    const agora = new Date(bloqueadoAte.getTime() + 1000); // 1 segundo depois
    expect(user.estaBloqueado(agora)).toBe(false);
  });

  it('should return true the instant before bloqueadoAte', () => {
    const bloqueadoAte = new Date(new Date().getTime() + 1000);
    const user = UserFactory.create({ bloqueadoAte });

    const agora = new Date(bloqueadoAte.getTime() - 1);
    expect(user.estaBloqueado(agora)).toBe(true);
  });
});

describe('User Login -> registrarLoginOk', () => {
  it('should reset falhasLogin, primeiraFalhaEm, and bloqueadoAte on successful login', () => {
    const user = UserFactory.create({
      falhasLogin: 3,
      primeiraFalhaEm: new Date(),
      bloqueadoAte: new Date(new Date().getTime() + 10 * 60 * 1000), // 10 minutos no futuro
    });

    user.registrarLoginOk();

    expect(user.falhasLogin).toBe(0);
    expect(user.primeiraFalhaEm).toBeNull();
    expect(user.bloqueadoAte).toBeNull();
  });
});
