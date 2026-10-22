// Busca de endereço pelo CEP via ViaCEP (https://viacep.com.br) — API pública,
// com CORS liberado pro navegador, por isso chama direto (sem passar pelo
// nosso proxy /api/*, que é só pro backend da Fivo).

export type EnderecoPorCep = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export class CepError extends Error {}

export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoPorCep> {
  const cepLimpo = cep.replace(/\D/g, "");

  if (cepLimpo.length !== 8) {
    throw new CepError("CEP deve ter 8 dígitos.");
  }

  let res: Response;
  try {
    res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
  } catch {
    throw new CepError("Não foi possível consultar o CEP. Verifique sua conexão.");
  }

  if (!res.ok) {
    throw new CepError("Não foi possível consultar o CEP. Tente novamente.");
  }

  const body = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };

  if (body.erro) {
    throw new CepError("CEP não encontrado.");
  }

  return {
    logradouro: body.logradouro ?? "",
    bairro: body.bairro ?? "",
    cidade: body.localidade ?? "",
    uf: body.uf ?? "",
  };
}
