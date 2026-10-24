"use client";

import { useState } from "react";
import { buscarEnderecoPorCep, CepError, type EnderecoPorCep } from "@/services/cep";

// Dispara a busca quando o CEP (já formatado) chegar a 8 dígitos; preenche
// os campos de endereço via `aoEncontrar`. Não mexe em número/complemento —
// isso a pessoa digita.
export function useBuscaCep(aoEncontrar: (endereco: EnderecoPorCep) => void) {
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar(cep: string) {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    setErro(null);
    setBuscando(true);
    try {
      const endereco = await buscarEnderecoPorCep(cep);
      aoEncontrar(endereco);
    } catch (e) {
      setErro(e instanceof CepError ? e.message : "Não foi possível buscar o CEP.");
    } finally {
      setBuscando(false);
    }
  }

  return { buscar, buscando, erro };
}
