// Cliente HTTP pra API (../api). Todas as chamadas passam por /api/*, que o
// next.config.ts redireciona pro backend — assim o navegador nunca faz uma
// requisição cross-origin de verdade (sem CORS, sem configurar cookie
// cross-site).

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

export type Papel = "ADMIN" | "EMPRESA" | "INSTITUICAO";

export function login(email: string, senha: string): Promise<{ papel: Papel }> {
  return request("/sessoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
}

export function logout(): Promise<void> {
  return request("/sessoes/atual", { method: "DELETE" });
}

export type CriarEmpresaInput = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  senha: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  contato: string;
  site?: string;
  logo?: File | null;
};

export function criarEmpresa(input: CriarEmpresaInput): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append("razaoSocial", input.razaoSocial);
  formData.append("nomeFantasia", input.nomeFantasia);
  formData.append("cnpj", input.cnpj);
  formData.append("email", input.email);
  formData.append("senha", input.senha);
  formData.append("telefone", input.telefone);
  formData.append("cep", input.cep);
  formData.append("logradouro", input.logradouro);
  formData.append("numero", input.numero);
  if (input.complemento) formData.append("complemento", input.complemento);
  formData.append("bairro", input.bairro);
  formData.append("cidade", input.cidade);
  formData.append("uf", input.uf);
  formData.append("contato", input.contato);
  if (input.site) formData.append("site", input.site);
  if (input.logo) formData.append("logo", input.logo);

  // Sem Content-Type manual: o browser define o boundary do multipart sozinho.
  return request("/empresas", { method: "POST", body: formData });
}

export type EmpresaAtual = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  emailPendente: string | null;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  site: string | null;
  contato: string;
  status: string;
  logoArquivoId: string | null;
  criadoEm: string;
};

export function getEmpresaAtual(): Promise<EmpresaAtual> {
  return request("/empresas/me");
}
