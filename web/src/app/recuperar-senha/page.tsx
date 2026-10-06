"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import GrassRoundedIcon from "@mui/icons-material/GrassRounded";
import { APP_ROUTES } from "@/lib/routes";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErro("Informe seu e-mail corporativo.");
      return;
    }

    setErro(null);
    setLoading(true);

    // Simulação do envio de e-mail de recuperação
    setTimeout(() => {
      setLoading(false);
      setEnviado(true);
    }, 1200);
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
      <Container maxWidth="md">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "#FFFFFF",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
            minHeight: 460,
          }}
        >
          {/* Painel Esquerdo Verde */}
          <Box
            sx={{
              width: { xs: "100%", md: "46%" },
              bgcolor: "#0F6E56",
              color: "#FFFFFF",
              p: { xs: 4, md: 5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              {/* Logo */}
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
                <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: -0.5 }}>
                  fivo
                </Typography>
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, lineHeight: 1.25 }}>
                Vamos recuperar seu acesso.
              </Typography>

              <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6, maxWidth: 300 }}>
                Informe o e-mail cadastrado na sua conta e enviaremos um link seguro para você redefinir sua senha.
              </Typography>
            </Box>

            {/* Métricas */}
            <Box sx={{ display: "flex", gap: 4, mt: { xs: 4, md: 6 } }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  312
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.75)" }}>
                  empresas
                </Typography>
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  R$ 1,2M
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.75)" }}>
                  doado
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Painel Direito Branco */}
          <Box
            sx={{
              width: { xs: "100%", md: "54%" },
              p: { xs: 4, md: 5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: "#1B1B19" }}>
              Recuperar senha
            </Typography>
            <Typography variant="body2" sx={{ color: "#71717A", mb: 3 }}>
              Informe seu e-mail corporativo cadastrado.
            </Typography>

            {erro && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {erro}
              </Alert>
            )}

            {enviado ? (
              <Box sx={{ textAlign: "center", py: 2 }}>
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2, textAlign: "left" }}>
                  Enviamos as instruções para <strong>{email}</strong>. Verifique sua caixa de entrada e spam.
                </Alert>

                <Button
                  component={Link}
                  href={APP_ROUTES.public.recuperarSenhaRedefinir}
                  variant="outlined"
                  fullWidth
                  sx={{
                    mb: 2,
                    py: 1.2,
                    borderRadius: 2,
                    textTransform: "none",
                    borderColor: "#0F6E56",
                    color: "#0F6E56",
                    fontWeight: 600,
                  }}
                >
                  Simular abertura do link recebido
                </Button>

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
            ) : (
              <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "#333333", mb: 1, display: "block" }}>
                    E-mail corporativo
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="email"
                    placeholder="nome@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "#FFFFFF",
                      },
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    bgcolor: "#0F6E56",
                    "&:hover": { bgcolor: "#0B5240" },
                    py: 1.3,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    mt: 1,
                  }}
                >
                  {loading ? <CircularProgress size={22} sx={{ color: "#FFFFFF" }} /> : "Enviar link de recuperação"}
                </Button>

                <Box sx={{ textAlign: "center", mt: 1 }}>
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
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
