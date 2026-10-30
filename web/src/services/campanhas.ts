// Funções específicas do recurso "campanhas" — área da empresa logada. Usa o
// cliente genérico de services/api.ts.

import { ApiError, request } from "./api";

export type StatusCampanha = "RASCUNHO" | "EM_ANALISE" | "APROVADA" | "REJEITADA";

// Decimais chegam como string ("1.50"), como nos demais endpoints de campanhas.
export type RegraDoacao =
  | { tipo: "POR_UNIDADE"; valor: string }
  | { tipo: "PERCENTUAL"; percentual: string };

export type CampanhaResumo = {
  id: string;
  nome: string;
  status: StatusCampanha;
  regraDoacao: RegraDoacao | null;
  // Preenchida só na campanha APROVADA.
  urlPublica: string | null;
};

export type SeloBaixado = {
  arquivo: Blob;
  nomeArquivo: string;
};

// Mais recente primeiro.
export function listarCampanhas(): Promise<CampanhaResumo[]> {
  return request("/campanhas");
}

const NOME_PADRAO_SELO = "selo.svg";

// Content-Disposition: attachment; filename="selo-agua-limpa.svg"
function nomeDoArquivo(contentDisposition: string | null): string {
  const nome = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
  return nome ?? NOME_PADRAO_SELO;
}

// O selo vem como arquivo SVG, e não como JSON, então não passa pelo
// `request` — que só lê corpo JSON. A URL, o cookie e os erros seguem o mesmo
// padrão dele.
export async function baixarSelo(id: string): Promise<SeloBaixado> {
  let res: Response;
  try {
    res = await fetch(`/api/campanhas/${encodeURIComponent(id)}/selo`, {
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar com o servidor. Verifique sua conexão.");
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    const erro = contentType.includes("application/json")
      ? ((await res.json()) as { message?: string })
      : undefined;
    throw new ApiError(res.status, erro?.message ?? "Ocorreu um erro inesperado. Tente novamente.");
  }

  return {
    arquivo: await res.blob(),
    nomeArquivo: nomeDoArquivo(res.headers.get("content-disposition")),
  };
}
