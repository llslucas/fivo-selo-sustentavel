"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { MOTIVO_REJEICAO_MINIMO } from "@/services/admin";

type DialogoMotivoRejeicaoProps = {
  open: boolean;
  titulo: string;
  descricao: React.ReactNode;
  // Requisição em andamento: trava os botões e impede fechar o diálogo.
  enviando: boolean;
  // Erro da última tentativa, já pronto pra exibir (ver mensagemDeErro).
  erro?: string | null;
  onCancelar: () => void;
  // Recebe o motivo sem espaços nas pontas, já com o tamanho mínimo.
  onConfirmar: (motivo: string) => void;
};

// Diálogo de rejeição com motivo obrigatório, usado nas filas do admin
// (instituições e empresas). O motivo vai por e-mail para quem foi rejeitado.
export default function DialogoMotivoRejeicao({
  open,
  titulo,
  descricao,
  enviando,
  erro,
  onCancelar,
  onConfirmar,
}: DialogoMotivoRejeicaoProps) {
  const [motivo, setMotivo] = useState("");
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const tamanho = motivo.trim().length;
  const curto = tamanho < MOTIVO_REJEICAO_MINIMO;
  const mostrarErro = tentouEnviar && curto;

  function fechar() {
    if (!enviando) onCancelar();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTentouEnviar(true);
    if (curto || enviando) return;
    onConfirmar(motivo.trim());
  }

  // Limpa o campo só depois da animação de saída, pra não piscar vazio.
  function limpar() {
    setMotivo("");
    setTentouEnviar(false);
  }

  return (
    <Dialog
      open={open}
      onClose={fechar}
      fullWidth
      maxWidth="sm"
      aria-labelledby="dialogo-motivo-rejeicao-titulo"
      aria-describedby="dialogo-motivo-rejeicao-descricao"
      slotProps={{
        paper: { component: "form", onSubmit: handleSubmit },
        transition: { onExited: limpar },
      }}
    >
      <DialogTitle id="dialogo-motivo-rejeicao-titulo">{titulo}</DialogTitle>
      <DialogContent>
        <DialogContentText id="dialogo-motivo-rejeicao-descricao" sx={{ mb: 2 }}>
          {descricao}
        </DialogContentText>

        {erro && <ErrorMessage mensagem={erro} sx={{ mb: 2 }} />}

        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label="Motivo da rejeição"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          disabled={enviando}
          error={mostrarErro}
          helperText={
            mostrarErro
              ? `O motivo deve ter no mínimo ${MOTIVO_REJEICAO_MINIMO} caracteres (${tamanho}/${MOTIVO_REJEICAO_MINIMO}).`
              : `${tamanho}/${MOTIVO_REJEICAO_MINIMO} caracteres no mínimo`
          }
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={fechar} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" variant="contained" color="error" disabled={enviando}>
          {enviando ? <CircularProgress size={22} color="inherit" /> : "Rejeitar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
