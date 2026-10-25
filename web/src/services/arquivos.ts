// Download de arquivos guardados na API (GET /arquivos/{id}). A API só
// entrega o arquivo ao dono ou a um ADMIN, então a chamada leva o cookie de
// sessão como as demais. Fica fora de `request` porque a resposta de sucesso
// é binária (PDF, imagem), não JSON.

import { ApiError } from "@/services/api";

type ErroResposta = { message?: string };

export async function baixarArquivo(id: string): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(`/api/arquivos/${encodeURIComponent(id)}`, {
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar com o servidor. Verifique sua conexão.");
  }

  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    const erro = contentType.includes("application/json")
      ? ((await res.json()) as ErroResposta)
      : undefined;
    throw new ApiError(
      res.status,
      erro?.message ?? "Ocorreu um erro inesperado. Tente novamente.",
    );
  }

  return res.blob();
}
