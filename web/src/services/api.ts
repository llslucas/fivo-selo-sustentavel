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

// Status em que a mensagem da API não serve pra mostrar ao usuário: genérica
// demais ou em inglês (o 500 do Nest volta "Internal server error"). Nos
// demais (400, 409, 422, 429) a API já responde em português.
const MENSAGENS_POR_STATUS: Record<number, string> = {
  401: "Sua sessão expirou. Entre novamente para continuar.",
  403: "Você não tem permissão para acessar este conteúdo.",
  404: "Não encontramos o que você procurava.",
};
const MENSAGEM_SERVIDOR = "O servidor está indisponível no momento. Tente novamente em instantes.";
const MENSAGEM_INESPERADA = "Ocorreu um erro inesperado. Tente novamente.";

// Converte qualquer erro de chamada da API na mensagem mostrada na tela.
// `personalizadas` troca a mensagem de um status específico daquela tela
// (ex.: no login, 401 é senha errada e não sessão expirada).
export function mensagemDeErro(
  erro: unknown,
  personalizadas: Record<number, string> = {},
): string {
  if (!(erro instanceof ApiError)) return MENSAGEM_INESPERADA;
  if (personalizadas[erro.status]) return personalizadas[erro.status];
  if (erro.status === 0) return erro.message;
  if (erro.status >= 500) return MENSAGEM_SERVIDOR;
  return MENSAGENS_POR_STATUS[erro.status] ?? erro.message;
}

// Vale oferecer "Tentar novamente": sem conexão ou servidor fora do ar. Erros
// de validação, permissão ou não encontrado dão o mesmo resultado se repetir.
export function ehErroRecuperavel(erro: unknown): boolean {
  return erro instanceof ApiError && (erro.status === 0 || erro.status >= 500);
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
