import type { Papel } from '@/services/auth';

export const APP_ROUTES = {
  public: {
    landing: '/',
    home: '/home',
    login: '/login',
    cadastro: '/cadastro',
    cadastroInstituicao: '/cadastro-instituicao',
    recuperarSenha: '/recuperar-senha',
    recuperarSenhaRedefinir: '/recuperar-senha/redefinir',
    parceiros: '/parceiros',
    erro: '/Erro',
  },
  private: {
    dashboard: '/dashboard',
    campanhas: '/campanhas',
    comprovantes: '/comprovantes',
    selos: '/selos',
    instituicao: '/instituicao',
  },
  admin: {
    inicio: '/admin',
    instituicoes: '/admin/instituicoes',
    empresas: '/admin/empresas',
    causas: '/admin/causas',
  },
  instituicao: {
    inicio: '/instituicao',
  },
} as const;

// Área de cada papel: destino depois do login e de quem abre a área de outro papel.
const ROTA_INICIAL_POR_PAPEL: Record<Papel, string> = {
  EMPRESA: APP_ROUTES.private.dashboard,
  ADMIN: APP_ROUTES.admin.inicio,
  INSTITUICAO: APP_ROUTES.instituicao.inicio,
};

export const rotaInicialDoPapel = (papel: Papel): string => ROTA_INICIAL_POR_PAPEL[papel];

export const isPublicRoute = (path: string): boolean => {
  if (path.startsWith('/parceiros')) return true;
  if (path.startsWith('/recuperar-senha')) return true;
  return (Object.values(APP_ROUTES.public) as string[]).includes(path);
};

export const isPrivateRoute = (path: string): boolean => {
  return (Object.values(APP_ROUTES.private) as string[]).includes(path);
};
