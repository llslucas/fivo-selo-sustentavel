// Funções específicas do recurso "causas" — catálogo público de causas que uma
// instituição pode defender. Usa o cliente genérico de services/api.ts.

import { request } from "./api";

export type Causa = {
  id: string;
  nome: string;
  descricao: string;
};

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