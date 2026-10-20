// Funções específicas do recurso "beneficiadas" — catálogo de instituições e
// causas servido por GET /beneficiadas. Usa o cliente genérico de
// services/api.ts, seguindo a convenção de empresas.ts/auth.ts.

import { request } from "./api";

export type TipoBeneficiada = "INSTITUICAO" | "CAUSA";

export type Beneficiada = {
  tipo: TipoBeneficiada;
  id: string;
  nome: string;
  causa: string | null;
  cidade: string | null;
  uf: string | null;
  descricao: string;
  site: string | null;
  logoArquivoId: string | null;
};

// Lista o catálogo real. Sem `busca` ou com termo < 2 caracteres (após trim),
// não envia filtro (catálogo completo); de 2 caracteres em diante, envia
// `?busca=<termo>` codificado. Descarta itens sem `id` ou `nome` (Req 1.8).
export async function listarBeneficiadas(busca?: string): Promise<Beneficiada[]> {
  const termo = busca?.trim() ?? "";
  const path =
    termo.length >= 2 ? `/beneficiadas?busca=${encodeURIComponent(termo)}` : "/beneficiadas";

  const beneficiadas = await request<Beneficiada[]>(path);

  return beneficiadas.filter((item) => Boolean(item?.id) && Boolean(item?.nome));
}
