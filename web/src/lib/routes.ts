export const APP_ROUTES = {
  public: {
    landing: '/',
    home: '/home',
    login: '/login',
    cadastro: '/cadastro',
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
  },
} as const;

export const isPublicRoute = (path: string): boolean => {
  if (path.startsWith('/parceiros')) return true;
  if (path.startsWith('/recuperar-senha')) return true;
  return Object.values(APP_ROUTES.public).includes(path as any);
};

export const isPrivateRoute = (path: string): boolean => {
  return Object.values(APP_ROUTES.private).includes(path as any);
};
