"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import type { SxProps, Theme } from "@mui/material/styles";

type ErrorMessageProps = {
  mensagem: string;
  // Quando informado, mostra o botão "Tentar novamente" dentro do alerta.
  onRetry?: () => void;
  // Desabilita o botão de retry (ex.: enquanto uma nova tentativa está em
  // andamento, evitando requisições simultâneas). Opcional e retrocompatível:
  // quando ausente, o botão permanece habilitado como antes.
  onRetryDisabled?: boolean;
  sx?: SxProps<Theme>;
};

// Alerta de erro padrão das telas. A mensagem já vem pronta pra exibir
// (ver mensagemDeErro em @/services/api).
export default function ErrorMessage({
  mensagem,
  onRetry,
  onRetryDisabled,
  sx,
}: ErrorMessageProps) {
  return (
    <Alert
      severity="error"
      sx={sx}
      action={
        onRetry && (
          <Button
            color="inherit"
            size="small"
            onClick={onRetry}
            disabled={onRetryDisabled}
            sx={{ textTransform: "none" }}
          >
            Tentar novamente
          </Button>
        )
      }
    >
      {mensagem}
    </Alert>
  );
}
