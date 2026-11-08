"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import GrassRoundedIcon from "@mui/icons-material/GrassRounded";
import { APP_ROUTES } from "@/lib/routes";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { ApiError, mensagemDeErro } from "@/services/api";
import { confirmarTrocaEmail } from "@/services/empresas";

// Destino do link do e-mail EMAIL_CONFIRMACAO: {WEB_URL}/confirmar-email?token=...
// A confirmação só acontece no clique do botão, não ao abrir a página: leitores
// de e-mail e antivírus costumam abrir links sozinhos, e isso não pode trocar o
// e-mail de ninguém.

type Estado = "pronto" | "enviando" | "confirmado" | "link-invalido" | "email-em-uso";

const MENSAGEM_LINK_INVALIDO =
  "Este link de confirmação é inválido ou expirou. Peça a troca de e-mail de novo para receber um link novo.";
const MENSAGEM_EMAIL_EM_USO =
  "Este e-mail já está cadastrado em outra conta, então a troca não foi feita. Peça a troca para outro endereço.";

const estiloBotao = {
  bgcolor: "#0F6E56",
  "&:hover": { bgcolor: "#0B5240" },
  py: 1.3,
  borderRadius: 2,
  textTransform: "none",
  fontWeight: 600,
} as const;

// useSearchParams exige um Suspense acima dele pra página poder ser pré-renderizada.
export default function ConfirmarEmailPage() {
  return (
    <Suspense>
      <ConfirmarEmail />
    </Suspense>
  );
}

function ConfirmarEmail() {
  const token = useSearchParams().get("token");
  const [estado, setEstado] = useState<Estado>(token ? "pronto" : "link-invalido");
  const [erro, setErro] = useState<string | null>(null);

  const confirmar = async () => {
    if (!token) return;
    setErro(null);
    setEstado("enviando");
    try {
      await confirmarTrocaEmail(token);
      setEstado("confirmado");
    } catch (e) {
      if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
        setEstado("link-invalido");
        return;
      }
      if (e instanceof ApiError && e.status === 409) {
        setEstado("email-em-uso");
        return;
      }
      setErro(mensagemDeErro(e));
      setEstado("pronto");
    }
  };

  return (
    <Box
      component="section"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#EDECE8",
        p: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="sm" disableGutters>
        <Box
          sx={{
            bgcolor: "#FFFFFF",
            borderRadius: 3,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
            p: { xs: 3, sm: 5 },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 4 }}>
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
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: -0.5, color: "#0F6E56" }}>
              Fivo
            </Typography>
          </Box>

          <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 0.75, color: "#1B1B19" }}>
            Confirmar novo e-mail
          </Typography>

          {estado === "confirmado" ? (
            <>
              <Alert severity="success" sx={{ my: 3, borderRadius: 2 }}>
                Novo e-mail confirmado! A partir de agora, use este endereço para entrar na plataforma.
              </Alert>
              <Button component={Link} href={APP_ROUTES.public.login} variant="contained" fullWidth sx={estiloBotao}>
                Ir para o login
              </Button>
            </>
          ) : estado === "link-invalido" || estado === "email-em-uso" ? (
            <>
              <ErrorMessage
                mensagem={estado === "link-invalido" ? MENSAGEM_LINK_INVALIDO : MENSAGEM_EMAIL_EM_USO}
                sx={{ my: 3, borderRadius: 2 }}
              />
              <VoltarParaLogin />
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ color: "#71717A", mb: 3 }}>
                Você pediu para trocar o e-mail da sua conta Fivo para este endereço. Clique no botão abaixo para
                concluir a troca.
              </Typography>
              {erro && <ErrorMessage mensagem={erro} sx={{ mb: 2, borderRadius: 2 }} />}
              <Button
                variant="contained"
                fullWidth
                onClick={confirmar}
                disabled={estado === "enviando"}
                sx={{ ...estiloBotao, mb: 2 }}
              >
                {estado === "enviando" ? (
                  <CircularProgress size={22} sx={{ color: "#FFFFFF" }} aria-label="Confirmando" />
                ) : (
                  "Confirmar novo e-mail"
                )}
              </Button>
              <VoltarParaLogin />
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
}

function VoltarParaLogin() {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Link
        href={APP_ROUTES.public.login}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#B43428",
          textDecoration: "none",
          fontSize: "0.875rem",
          fontWeight: 500,
        }}
      >
        <ArrowBackRoundedIcon sx={{ fontSize: 16 }} />
        Voltar para o login
      </Link>
    </Box>
  );
}
