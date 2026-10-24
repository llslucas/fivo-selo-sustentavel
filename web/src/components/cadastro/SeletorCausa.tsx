"use client";

import { useCallback, useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import { listarCausasComTimeout, type Causa } from "@/services/causas";
import { mensagemDeErro } from "@/services/api";
import ErrorMessage from "@/components/ui/ErrorMessage";

// Estado reportado ao formulário pai. "pronto" é o único estado em que o
// formulário libera o envio. A renderização por estado (carregando/erro/vazio/
// pronto) é implementada nas tarefas 2.3–2.5; aqui vive a máquina de transições.
export type EstadoSeletorCausa = "carregando" | "erro" | "vazio" | "pronto";

export type SeletorCausaProps = {
  value: string;
  onChange: (causaId: string) => void;
  label: React.ReactNode;
  error?: string;
  recarregarChave?: number;
  onEstadoChange?: (estado: EstadoSeletorCausa) => void;
  // Reporta ao pai os ids das causas da última lista carregada. Permite ao
  // formulário validar localmente que o causaId enviado pertence à lista
  // apresentada (Requisito 2.5), já que o SeletorCausa é o dono da lista.
  onCausasChange?: (ids: string[]) => void;
};

// Dono do próprio fetch: busca as causas via listarCausasComTimeout() (10 s com
// AbortController interno), roda a máquina de quatro estados e reporta o estado
// ao pai. A renderização por estado é evoluída nas tarefas 2.3–2.5.
export default function SeletorCausa({
  value,
  onChange,
  label,
  error,
  recarregarChave = 0,
  onEstadoChange,
  onCausasChange,
}: SeletorCausaProps) {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [estado, setEstado] = useState<EstadoSeletorCausa>("carregando");
  // Guarda o erro capturado na busca para compor a mensagem do estado "erro"
  // via mensagemDeErro(). É reiniciado a cada nova busca.
  const [erroBusca, setErroBusca] = useState<unknown>(null);
  // Gatilho interno de recarregamento. O botão "Tentar novamente" (tarefa 2.4)
  // chama recarregar() para incrementá-lo e refazer a busca. Combina com a
  // prop recarregarChave (recarregamento pós-422 vindo do formulário).
  const [recarregarInterno, setRecarregarInterno] = useState(0);

  const recarregar = useCallback(() => {
    setRecarregarInterno((n) => n + 1);
  }, []);

  // Busca com timeout + máquina de transições. Reinicia no montar, quando a
  // prop recarregarChave muda (pós-422) e quando recarregar() é chamado.
  // A busca roda numa função assíncrona interna: o setEstado("carregando") fica
  // fora do corpo síncrono do efeito (evita a cascata de renders sinalizada por
  // react-hooks/set-state-in-effect). A flag `ativo` descarta resultados de
  // buscas antigas ao recarregar/desmontar (evita requisições simultâneas /
  // setState após desmontar), papel antes exercido por controller.signal.
  useEffect(() => {
    let ativo = true;

    async function buscar() {
      setEstado("carregando");
      try {
        const lista = await listarCausasComTimeout();
        if (!ativo) return;
        setCausas(lista);
        setEstado(lista.length > 0 ? "pronto" : "vazio");
      } catch (e: unknown) {
        if (!ativo) return;
        setErroBusca(e);
        setEstado("erro");
      }
    }

    void buscar();

    return () => {
      ativo = false;
    };
  }, [recarregarChave, recarregarInterno]);

  // Reporta o estado ao pai fora do render (evita setState-durante-render no
  // formulário, que derivaria a habilitação do botão "Enviar" desse estado).
  useEffect(() => {
    onEstadoChange?.(estado);
  }, [estado, onEstadoChange]);

  // Reporta ao pai os ids da última lista carregada (fora do render, mesma
  // razão). O formulário usa esses ids para bloquear o envio de um causaId que
  // não pertence à lista apresentada (Requisito 2.5).
  useEffect(() => {
    onCausasChange?.(causas.map((causa) => causa.id));
  }, [causas, onCausasChange]);

  const carregando = estado === "carregando";
  const falhou = estado === "erro";
  const vazio = estado === "vazio";

  // Estado erro (tarefa 2.4): exibe o ErrorMessage com a mensagem derivada do
  // erro capturado (mensagemDeErro) e "Tentar novamente", que chama recarregar()
  // para refazer a busca. O botão fica desabilitado enquanto a nova busca está
  // em "carregando" (Requisito 4.6 — evita requisições simultâneas). Como a
  // transição para "carregando" substitui este render, desabilitamos via
  // carregando por completude de contrato.
  if (falhou) {
    return (
      <ErrorMessage
        mensagem={mensagemDeErro(erroBusca)}
        onRetry={recarregar}
        onRetryDisabled={carregando}
      />
    );
  }

  // Texto de ajuda por estado:
  // - carregando (tarefa 2.3): "Carregando causas…" (seleção bloqueada).
  // - vazio (tarefa 2.5): mensagem exata "Ainda não há causas cadastradas"
  //   (seleção bloqueada; a lista está vazia).
  // - demais: eventual erro de campo vindo do formulário.
  const ajuda = carregando
    ? "Carregando causas…"
    : vazio
      ? "Ainda não há causas cadastradas"
      : error;

  // Estado vazio (tarefa 2.5): o seletor fica desabilitado (seleção bloqueada)
  // e exibe a mensagem exata via helperText. Estado pronto: habilitado, cada
  // opção exibe o nome em destaque e a descrição como texto secundário, na
  // ordem recebida (o front não reordena nem filtra — Data Models do design).
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={carregando || vazio}
      error={Boolean(error)}
      helperText={ajuda}
      fullWidth
      slotProps={
        carregando
          ? {
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <CircularProgress size={20} aria-label="Carregando causas…" />
                  </InputAdornment>
                ),
              },
            }
          : undefined
      }
    >
      {causas.map((causa) => (
        <MenuItem key={causa.id} value={causa.id}>
          <ListItemText primary={causa.nome} secondary={causa.descricao} />
        </MenuItem>
      ))}
    </TextField>
  );
}
