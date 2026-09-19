import { Controller, Get, HttpCode, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import request from 'supertest';

import { Hasher } from '@domain/fivo/application/ports/cryptography/hasher';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { User, UserRole } from '@domain/fivo/entities/user';
import { AdminSeeder } from '@infra/auth/admin-seeder';
import { AuthModule } from '@infra/auth/auth.module';
import { CurrentUser } from '@infra/auth/current-user.decorator';
import { Public } from '@infra/auth/public.decorator';
import { Roles } from '@infra/auth/roles.decorator';
import { definirCookieDeSessao } from '@infra/auth/session-cookie';
import { SessionService } from '@infra/auth/session.service';
import { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';
import { GeradorTokenOpaco } from '@infra/cryptography/gerador-token-opaco';
import { UserFactory } from '@test/factories/user-factory';
import {
  AppDeTeste,
  comCookieDeSessao,
  criarAppDeTeste,
  limparBanco,
  servidorHttp,
} from '@test/helpers/e2e-app';

@Controller('prova-auth')
class ProvaAuthController {
  constructor(private readonly sessionService: SessionService) {}

  @Public()
  @Post('entrar/:usuarioId')
  @HttpCode(204)
  async entrar(
    @Param('usuarioId') usuarioId: string,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<void> {
    const { token } = await this.sessionService.criar(usuarioId);
    definirCookieDeSessao(resposta, token);
  }

  @Public()
  @Get('publica')
  publica() {
    return { ok: true };
  }

  @Get('protegida')
  protegida(@CurrentUser() usuario: UsuarioAutenticado | undefined) {
    return { id: usuario?.id, role: usuario?.role };
  }

  @Roles(UserRole.ADMIN)
  @Get('admin')
  admin() {
    return { ok: true };
  }
}

describe('AuthModule — sessão opaca, guards e decorators (e2e)', () => {
  let contexto: AppDeTeste;
  let userRepository: UserRepository;
  let sessionService: SessionService;
  let geradorToken: GeradorTokenOpaco;

  async function criarUsuario(role: UserRole, email: string): Promise<User> {
    const user = UserFactory.create({ role, email });
    await userRepository.create(user);
    return user;
  }

  beforeAll(async () => {
    contexto = await criarAppDeTeste({
      controllers: [ProvaAuthController],
      imports: [AuthModule],
    });
    userRepository = contexto.app.get(UserRepository);
    sessionService = contexto.app.get(SessionService);
    geradorToken = contexto.app.get(GeradorTokenOpaco);
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  afterEach(() => {
    delete process.env.COOKIE_SECURE;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_SENHA;
  });

  it('SessionService.criar grava só o sha256 do token, nunca o token cru', async () => {
    const user = await criarUsuario(UserRole.EMPRESA, 'a@empresa.test');

    const { token } = await sessionService.criar(user.id.toString());

    const linhas = await contexto.prisma.sessao.findMany();
    expect(linhas).toHaveLength(1);
    expect(linhas[0].tokenHash).toBe(geradorToken.sha256(token));
    expect(linhas[0].tokenHash).not.toBe(token);
    expect(JSON.stringify(linhas[0])).not.toContain(token);
  });

  it('o cookie de sessão é httpOnly e SameSite=Lax, sem Secure por padrão', async () => {
    const user = await criarUsuario(UserRole.EMPRESA, 'a@empresa.test');

    const resposta = await request(servidorHttp(contexto)).post(
      `/prova-auth/entrar/${user.id.toString()}`,
    );

    const cookie = String(resposta.headers['set-cookie'][0]);
    expect(cookie).toContain('fivo_sessao=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).not.toContain('Secure');
  });

  it('o cookie de sessão ganha Secure quando COOKIE_SECURE=true', async () => {
    process.env.COOKIE_SECURE = 'true';
    const user = await criarUsuario(UserRole.EMPRESA, 'a@empresa.test');

    const resposta = await request(servidorHttp(contexto)).post(
      `/prova-auth/entrar/${user.id.toString()}`,
    );

    expect(String(resposta.headers['set-cookie'][0])).toContain('Secure');
  });

  it('rota protegida sem cookie → 401', async () => {
    const resposta = await request(servidorHttp(contexto)).get(
      '/prova-auth/protegida',
    );

    expect(resposta.status).toBe(401);
  });

  it('rota protegida com token inexistente → 401', async () => {
    const resposta = await comCookieDeSessao(
      request(servidorHttp(contexto)).get('/prova-auth/protegida'),
      'token-que-nao-existe',
    );

    expect(resposta.status).toBe(401);
  });

  it('sessão válida → 200 com o usuário e o papel injetados', async () => {
    const user = await criarUsuario(UserRole.EMPRESA, 'a@empresa.test');
    const { token } = await sessionService.criar(user.id.toString());

    const resposta = await comCookieDeSessao(
      request(servidorHttp(contexto)).get('/prova-auth/protegida'),
      token,
    );

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      id: user.id.toString(),
      role: UserRole.EMPRESA,
    });
  });

  it('@Public isenta a rota da autenticação', async () => {
    const resposta = await request(servidorHttp(contexto)).get(
      '/prova-auth/publica',
    );

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ ok: true });
  });

  it('papel errado → 403; papel certo → 200', async () => {
    const empresa = await criarUsuario(UserRole.EMPRESA, 'a@empresa.test');
    const admin = await criarUsuario(UserRole.ADMIN, 'admin@fivo.test');
    const sessaoEmpresa = await sessionService.criar(empresa.id.toString());
    const sessaoAdmin = await sessionService.criar(admin.id.toString());

    const negada = await comCookieDeSessao(
      request(servidorHttp(contexto)).get('/prova-auth/admin'),
      sessaoEmpresa.token,
    );
    const permitida = await comCookieDeSessao(
      request(servidorHttp(contexto)).get('/prova-auth/admin'),
      sessaoAdmin.token,
    );

    expect(negada.status).toBe(403);
    expect(negada.body).toMatchObject({ message: 'Acesso negado' });
    expect(permitida.status).toBe(200);
  });

  it('sessão revogada → 401', async () => {
    const user = await criarUsuario(UserRole.EMPRESA, 'a@empresa.test');
    const { token } = await sessionService.criar(user.id.toString());
    const sessao = await contexto.prisma.sessao.findFirstOrThrow();

    await sessionService.revogar(sessao.id);

    const resposta = await comCookieDeSessao(
      request(servidorHttp(contexto)).get('/prova-auth/protegida'),
      token,
    );

    expect(resposta.status).toBe(401);
  });

  it('sessão inativa por mais de 8h → 401 e a sessão é revogada', async () => {
    const user = await criarUsuario(UserRole.EMPRESA, 'a@empresa.test');
    const { token } = await sessionService.criar(user.id.toString());
    await contexto.prisma.sessao.updateMany({
      data: { ultimoAcessoEm: new Date(Date.now() - 9 * 60 * 60 * 1000) },
    });

    const resposta = await comCookieDeSessao(
      request(servidorHttp(contexto)).get('/prova-auth/protegida'),
      token,
    );

    expect(resposta.status).toBe(401);
    const sessao = await contexto.prisma.sessao.findFirstOrThrow();
    expect(sessao.revogadaEm).not.toBeNull();
  });

  it('requisição dentro da janela desliza ultimoAcessoEm', async () => {
    const user = await criarUsuario(UserRole.EMPRESA, 'a@empresa.test');
    const { token } = await sessionService.criar(user.id.toString());
    const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
    await contexto.prisma.sessao.updateMany({
      data: { ultimoAcessoEm: umaHoraAtras },
    });

    const resposta = await comCookieDeSessao(
      request(servidorHttp(contexto)).get('/prova-auth/protegida'),
      token,
    );

    expect(resposta.status).toBe(200);
    const sessao = await contexto.prisma.sessao.findFirstOrThrow();
    expect(sessao.ultimoAcessoEm.getTime()).toBeGreaterThan(
      umaHoraAtras.getTime() + 30 * 60 * 1000,
    );
    expect(sessao.revogadaEm).toBeNull();
  });

  it('o seed cria um ADMIN idempotente a partir do env', async () => {
    process.env.ADMIN_EMAIL = 'Admin@Fivo.test';
    process.env.ADMIN_SENHA = 'SenhaDoAdmin123';
    const seeder = contexto.app.get(AdminSeeder);

    await seeder.executar();
    await seeder.executar();

    const admins = await contexto.prisma.usuario.findMany({
      where: { role: 'ADMIN' },
    });
    expect(admins).toHaveLength(1);
    expect(admins[0].email).toBe('admin@fivo.test');
    expect(admins[0].senhaHash).not.toBe('SenhaDoAdmin123');
    const hasher = contexto.app.get(Hasher);
    expect(await hasher.compare('SenhaDoAdmin123', admins[0].senhaHash)).toBe(
      true,
    );
  });
});
