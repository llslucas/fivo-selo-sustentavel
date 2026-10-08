"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import type { SxProps, Theme } from "@mui/material/styles";

type ErrorMessageProps = {
  mensagem: string;
  // Quando informado, mostra o botão "Tentar novamente" dentro do alerta.
  onRetry?: () => void;
  sx?: SxProps<Theme>;
};

// Alerta de erro padrão das telas. A mensagem já vem pronta pra exibir
// (ver mensagemDeErro em @/lib/api).
export default function ErrorMessage({ mensagem, onRetry, sx }: ErrorMessageProps) {
  return (
    <Alert
      severity="error"
      sx={sx}
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry} sx={{ textTransform: "none" }}>
            Tentar novamente
          </Button>
        )
      }
    >
      {mensagem}
    </Alert>
  );
}
