// Funções específicas do recurso "causas" — catálogo público de causas que uma
// instituição pode defender. Usa o cliente genérico de services/api.ts.

import { ApiError, request } from "./api";

export type Causa = {
  id: string;
  nome: string;
  descricao: string;
};

export type DadosCausa = {
  nome: string;
  descricao: string;
};

export class CausaComInstituicoesError extends ApiError {
  readonly instituicoes: string[];
  constructor(message: string, instituicoes: string[]) {
    super(409, message);
    this.name = "CausaComInstituicoesError";
    this.instituicoes = instituicoes;
  }
}

// GET /causas — só causas ativas, em ordem alfabética.
export function listarCausas(): Promise<Causa[]> {
  return request("/causas");
}

// Tempo máximo de espera (ms) por /causas antes de abortar a requisição.
export const LIMITE_ESPERA_CAUSAS_MS = 10_000;

// Variante não-quebradora de listarCausas() com timeout via AbortController.
// Mantém listarCausas() e o tipo Causa intactos (preserva a F9). Ao estourar o
// limite, o AbortController dispara, o fetch rejeita e request() converte em
// ApiError(0, …) — classificado como recuperável por ehErroRecuperavel().
export function listarCausasComTimeout(
  limiteMs = LIMITE_ESPERA_CAUSAS_MS,
): Promise<Causa[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), limiteMs);
  // request<T> aceita RequestInit; passamos o signal.
  return request<Causa[]>("/causas", { signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

// POST /admin/causas — responde { id }. 409 "Causa já cadastrada" / 422.
export function criarCausa(dados: DadosCausa): Promise<{ id: string }> {
  return request("/admin/causas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
}

// PATCH /admin/causas/{id} — responde a causa com status. 409 / 422.
export function editarCausa(
  id: string,
  dados: DadosCausa,
): Promise<Causa & { status: "ATIVA" | "INATIVA" }> {
  return request(`/admin/causas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
}

export async function inativarCausa(id: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/api/admin/causas/${id}/inativacao`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar com o servidor. Verifique sua conexão.");
  }

  if (res.ok) return; // 204 sem corpo

  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? ((await res.json()) as { message?: string; instituicoes?: string[] })
    : undefined;

  if (res.status === 409 && body?.instituicoes && body.instituicoes.length > 0) {
    throw new CausaComInstituicoesError(
      body.message ?? "Causa com instituições vinculadas.",
      body.instituicoes,
    );
  }

  throw new ApiError(res.status, body?.message ?? "Não foi possível desativar a causa.");
}
