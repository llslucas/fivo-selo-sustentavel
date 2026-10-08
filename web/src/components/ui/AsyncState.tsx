"use client";

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { ehErroRecuperavel, mensagemDeErro } from "@/lib/api";
import ErrorMessage from "./ErrorMessage";

type AsyncStateProps = {
  loading: boolean;
  erro?: unknown;
  // Carregou sem erro, mas não veio nada (ex.: lista sem itens).
  vazio?: boolean;
  mensagemVazio?: string;
  // Recarrega os dados; o botão só aparece quando repetir pode resolver.
  onRetry?: () => void;
  children: React.ReactNode;
};

// Estados de uma tela que busca dados na API: carregando, erro, vazio ou o
// conteúdo. Nessa ordem de prioridade, pra um nunca ser confundido com outro.
export default function AsyncState({
  loading,
  erro,
  vazio = false,
  mensagemVazio = "Nenhum item encontrado.",
  onRetry,
  children,
}: AsyncStateProps) {
  if (loading) {
    return (
      <Box
        role="status"
        aria-label="Carregando"
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (erro) {
    return (
      <Box sx={{ maxWidth: 560, mx: "auto", my: 6, px: 2 }}>
        <ErrorMessage
          mensagem={mensagemDeErro(erro)}
          onRetry={onRetry && ehErroRecuperavel(erro) ? onRetry : undefined}
        />
      </Box>
    );
  }

  if (vazio) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {mensagemVazio}
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
