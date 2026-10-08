// Cliente HTTP genérico pra API (../api). Todas as chamadas passam por
// /api/*, que o next.config.ts redireciona pro backend — assim o navegador
// nunca faz uma requisição cross-origin de verdade (sem CORS, sem configurar
// cookie cross-site). Funções específicas de cada recurso (empresas, sessões,
// etc.) vivem em arquivos próprios dentro de services/ e importam `request`
// daqui — este arquivo não conhece nenhum endpoint específico.

export type CampoErro = { campo: string; mensagem: string };

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, errors: CampoErro[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = Object.fromEntries(
      errors.map((erro) => [erro.campo, erro.mensagem]),
    );
  }
}

type ErroResposta = {
  statusCode: number;
  message: string;
  errors?: CampoErro[];
};

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: "include",
      ...init,
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar com o servidor. Verifique sua conexão.");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await res.json()) as unknown)
    : undefined;

  if (!res.ok) {
    const erro = body as ErroResposta | undefined;
    throw new ApiError(
      res.status,
      erro?.message ?? "Ocorreu um erro inesperado. Tente novamente.",
      erro?.errors ?? [],
    );
  }

  return body as T;
}
