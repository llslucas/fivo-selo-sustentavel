"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import GrassRoundedIcon from "@mui/icons-material/GrassRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { APP_ROUTES } from "@/lib/routes";
import { useAuth } from "@/hooks/useAuth";

// Mesmos valores do InstituicaoStatus da API. Hoje a tela só recebe
// PENDENTE_APROVACAO: ainda não existe rota para a instituição ler o próprio
// cadastro. Quando existir, basta a página buscar o status e repassar aqui.
export type StatusCadastro = "PENDENTE_APROVACAO" | "APROVADA" | "REJEITADA";

type ConteudoStatus = {
  titulo: string;
  mensagem: string;
  icone: React.ReactNode;
  corFundoIcone: string;
};

const CONTEUDO: Record<StatusCadastro, ConteudoStatus> = {
  PENDENTE_APROVACAO: {
    titulo: "Cadastro em análise",
    mensagem: "Seu cadastro foi recebido e está em análise pela equipe",
    icone: <HourglassTopRoundedIcon sx={{ fontSize: 36, color: "secondary.dark" }} />,
    corFundoIcone: "secondary.light",
  },
  APROVADA: {
    titulo: "Cadastro aprovado",
    mensagem: "Seu cadastro foi aprovado pela equipe",
    icone: <CheckCircleRoundedIcon sx={{ fontSize: 36, color: "primary.main" }} />,
    corFundoIcone: "primary.light",
  },
  REJEITADA: {
    titulo: "Cadastro rejeitado",
    mensagem: "Seu cadastro foi rejeitado pela equipe",
    icone: <CancelRoundedIcon sx={{ fontSize: 36, color: "error.main" }} />,
    corFundoIcone: "#FDECEA",
  },
};

type Props = {
  status?: StatusCadastro;
  // Só usado quando status === "REJEITADA".
  motivo?: string;
};

export default function StatusCadastroInstituicao({
  status = "PENDENTE_APROVACAO",
  motivo,
}: Props) {
  const router = useRouter();
  const { logout } = useAuth();
  const [saindo, setSaindo] = useState(false);
  const conteudo = CONTEUDO[status];

  const handleLogout = () => {
    setSaindo(true);
    // logout() do contexto já chama DELETE /sessoes/atual e limpa o estado,
    // mesmo quando a chamada falha.
    void logout().then(() => router.push(APP_ROUTES.public.login));
  };

  return (
    <Box
      component="section"
      sx={{
        minHeight: "100vh",
        bgcolor: "#EFEFEF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: { xs: 4, md: 8 },
        px: 2,
      }}
    >
      <Container maxWidth="sm" disableGutters>
        <Box
          role="status"
          aria-live="polite"
          sx={{
            bgcolor: "background.default",
            borderRadius: 3,
            p: { xs: 3, sm: 5 },
            boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
            textAlign: "center",
          }}
        >
          {/* Logo */}
          <Box
            sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 4 }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                bgcolor: "#D98032",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
              }}
            >
              <GrassRoundedIcon sx={{ fontSize: 20 }} />
            </Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, letterSpacing: -0.5, color: "primary.main" }}
            >
              fivo
            </Typography>
          </Box>

          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              bgcolor: conteudo.corFundoIcone,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            {conteudo.icone}
          </Box>

          <Typography component="h1" variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {conteudo.titulo}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {conteudo.mensagem}
          </Typography>

          {status === "REJEITADA" && motivo && (
            <Box
              sx={{
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                p: 2,
                mb: 3,
                textAlign: "left",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
                Motivo
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                {motivo}
              </Typography>
            </Box>
          )}

          <Button
            variant="outlined"
            color="error"
            onClick={handleLogout}
            disabled={saindo}
            startIcon={saindo ? undefined : <LogoutRoundedIcon />}
            sx={{ px: 4, borderRadius: 2, width: { xs: "100%", sm: "auto" } }}
          >
            {saindo ? <CircularProgress size={22} color="inherit" /> : "Sair da conta"}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
