"use client";

// Hook de estado do catálogo de beneficiadas. Orquestra a máquina de estados
// (carregando/erro/vazio/carregado), o debounce de 300 ms sobre o termo, a
// regra de 2 caracteres (delegada ao serviço), a proteção anti-stale por
// identificador monotônico de requisição e a nova tentativa. Reusa os
// utilitários do Cliente_HTTP (`mensagemDeErro`, `ehErroRecuperavel`) para o
// tratamento de erro, sem reimplementar mapeamento de status.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  listarBeneficiadas,
  type Beneficiada,
} from "@/services/instituicoes";
import { ehErroRecuperavel, mensagemDeErro } from "@/services/api";

export type EstadoBeneficiadas = "carregando" | "erro" | "vazio" | "carregado";

export type UseBeneficiadasResultado = {
  estado: EstadoBeneficiadas;
  beneficiadas: Beneficiada[]; // relevante em "carregado"
  termoBusca: string;
  mensagemErro: string; // relevante em "erro"
  podeTentarNovamente: boolean; // true só quando ehErroRecuperavel
  definirTermoBusca: (termo: string) => void;
  tentarNovamente: () => void;
};

// Mensagem padrão exibida quando `mensagemDeErro` volta vazia/ausente
// (Requisitos 2.5, 4.7).
const MENSAGEM_PADRAO = "Não foi possível carregar as instituições. Tente novamente.";

// Debounce aplicado às alterações de termo antes de disparar a busca
// (Requisito 3.3).
const DEBOUNCE_MS = 300;

// Limite por busca (Requisitos 1.5, 3.7) e tempo limite da requisição
// (Requisitos 2.2, 4.1, 4.9). O menor deles governa quando o carregamento é
// encerrado e transiciona para erro.
const TIMEOUT_BUSCA_MS = 10_000;
const TIMEOUT_REQUISICAO_MS = 30_000;
const TIMEOUT_MS = Math.min(TIMEOUT_BUSCA_MS, TIMEOUT_REQUISICAO_MS);

// Erro sintético usado quando o tempo limite expira, para reusar o mesmo
// caminho de mapeamento/retry dos demais erros de rede.
function erroTimeout(): Error {
  return new Error("A requisição demorou demais. Tente novamente.");
}

export function useBeneficiadas(): UseBeneficiadasResultado {
  const [estado, setEstado] = useState<EstadoBeneficiadas>("carregando");
  const [beneficiadas, setBeneficiadas] = useState<Beneficiada[]>([]);
  const [termoBusca, setTermoBusca] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");
  const [podeTentarNovamente, setPodeTentarNovamente] = useState(false);

  // Termo debounced: só este dispara a busca. Começa vazio = catálogo completo.
  const [termoDebounced, setTermoDebounced] = useState("");

  // Identificador monotônico por requisição: só a resposta da requisição mais
  // recente é aplicada (anti-stale). Qualquer resposta de uma sequência
  // anterior é descartada (Requisitos 3.3, 5.5).
  const sequenciaRef = useRef(0);
  // AbortController ativo, para cancelamento lógico da requisição em voo.
  const abortRef = useRef<AbortController | null>(null);
  // Termo efetivamente usado na última busca, para a nova tentativa reemitir a
  // mesma requisição (Requisitos 2.7, 4.10).
  const ultimoTermoRef = useRef("");

  // Debounce das alterações de termo (Requisito 3.3). O termo digitado é
  // refletido imediatamente em `termoBusca` (preservação sob falha,
  // Requisito 3.7); apenas o disparo da busca aguarda 300 ms.
  useEffect(() => {
    const id = setTimeout(() => {
      setTermoDebounced(termoBusca);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [termoBusca]);

  // Executa a busca para um termo. Centraliza a máquina de estados, o
  // anti-stale, o timeout e o mapeamento de erro.
  const executarBusca = useCallback((termo: string) => {
    const sequencia = sequenciaRef.current + 1;
    sequenciaRef.current = sequencia;
    ultimoTermoRef.current = termo;

    // Cancela logicamente a requisição anterior em voo.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Só aplica o resultado se ainda for a requisição mais recente e não tiver
    // sido abortada (anti-stale + cancelamento lógico).
    const ehAtual = () => sequencia === sequenciaRef.current && !controller.signal.aborted;

    setEstado("carregando");

    let resolvido = false;

    const timeoutId = setTimeout(() => {
      if (resolvido) return;
      resolvido = true;
      // Avalia se esta ainda é a requisição mais recente ANTES de abortar: o
      // abort torna `controller.signal.aborted` verdadeiro e, portanto, faria
      // `ehAtual()` retornar false, impedindo a transição para erro.
      const aplicavel = ehAtual();
      controller.abort();
      if (!aplicavel) return;
      // Encerra o carregamento e transiciona para erro ao expirar o timeout
      // (Requisitos 1.5, 2.2, 3.7, 4.9).
      aplicarErro(erroTimeout());
    }, TIMEOUT_MS);

    function aplicarErro(erro: unknown) {
      // Preserva a lista previamente carregada; não a substitui por dados
      // parciais (Requisitos 2.4, 5.6, 7.3). O termo digitado também é
      // preservado, pois `termoBusca` não é tocado aqui (Requisito 3.7).
      const mensagem = mensagemDeErro(erro);
      setMensagemErro(mensagem && mensagem.trim() ? mensagem : MENSAGEM_PADRAO);
      setPodeTentarNovamente(ehErroRecuperavel(erro));
      setEstado("erro");
    }

    listarBeneficiadas(termo)
      .then((lista) => {
        if (resolvido) return;
        resolvido = true;
        clearTimeout(timeoutId);
        if (!ehAtual()) return; // resposta obsoleta: descartada
        setBeneficiadas(lista);
        // Lista vazia => "vazio"; com itens => "carregado" (regra do design).
        setEstado(lista.length === 0 ? "vazio" : "carregado");
        setMensagemErro("");
        setPodeTentarNovamente(false);
      })
      .catch((erro) => {
        if (resolvido) return;
        resolvido = true;
        clearTimeout(timeoutId);
        if (!ehAtual()) return; // falha de resposta obsoleta: descartada
        aplicarErro(erro);
      });
  }, []);

  // Dispara a busca inicial na montagem (catálogo completo) e refaz a busca
  // sempre que o termo debounced muda (Requisitos 1.1, 3.1–3.3).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza o carregamento com a busca HTTP (montagem/termo debounced)
    executarBusca(termoDebounced);
    // Cancela logicamente a requisição em voo ao desmontar ou re-disparar.
    return () => {
      abortRef.current?.abort();
    };
  }, [termoDebounced, executarBusca]);

  const definirTermoBusca = useCallback((termo: string) => {
    setTermoBusca(termo);
  }, []);

  // Reemite a última requisição e volta ao estado `carregando`
  // (Requisitos 2.7, 4.10).
  const tentarNovamente = useCallback(() => {
    executarBusca(ultimoTermoRef.current);
  }, [executarBusca]);

  return {
    estado,
    beneficiadas,
    termoBusca,
    mensagemErro,
    podeTentarNovamente,
    definirTermoBusca,
    tentarNovamente,
  };
}
