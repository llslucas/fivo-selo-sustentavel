"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import GrassRoundedIcon from "@mui/icons-material/GrassRounded";

export default function RedefinirSenhaPage() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Critérios de validação
  const temMin8 = novaSenha.length >= 8;
  const temMaiuscula = /[A-Z]/.test(novaSenha);
  const temNumero = /[0-9]/.test(novaSenha);
  const todasValidas = temMin8 && temMaiuscula && temNumero;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todasValidas) {
      setErro("Por favor, atenda a todos os critérios de senha antes de continuar.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas digitadas não coincidem.");
      return;
    }

    setErro(null);
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSucesso(true);
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
            minHeight: 490,
          }}
        >
          {/* Painel Esquerdo Verde */}
          <Box
            sx={{
              width: { xs: "100%", md: "42%" },
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
                  Fivo
                </Typography>
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, lineHeight: 1.25 }}>
                Quase lá!
              </Typography>

              <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", lineHeight: 1.6, maxWidth: 280 }}>
                Escolha uma nova senha forte para manter sua conta Fivo protegida.
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
              width: { xs: "100%", md: "58%" },
              p: { xs: 4, md: 5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.75, color: "#1B1B19" }}>
              Criar nova senha
            </Typography>
            <Typography variant="body2" sx={{ color: "#71717A", mb: 3 }}>
              Defina uma nova senha para acessar sua conta Fivo.
            </Typography>

            {erro && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                {erro}
              </Alert>
            )}

            {sucesso ? (
              <Box sx={{ textAlign: "center", py: 2 }}>
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2, textAlign: "left" }}>
                  Sua senha foi redefinida com sucesso! Você já pode entrar com suas novas credenciais.
                </Alert>
                <Button
                  component={Link}
                  href="/login"
                  variant="contained"
                  fullWidth
                  sx={{
                    bgcolor: "#0F6E56",
                    "&:hover": { bgcolor: "#0B5240" },
                    py: 1.3,
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Fazer login agora
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Nova Senha */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "#333333", mb: 0.75, display: "block" }}>
                    Nova senha
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="••••••••"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setMostrarSenha(!mostrarSenha)}
                              edge="end"
                              size="small"
                            >
                              {mostrarSenha ? (
                                <VisibilityOffOutlinedIcon fontSize="small" sx={{ color: "#8E8E93" }} />
                              ) : (
                                <VisibilityOutlinedIcon fontSize="small" sx={{ color: "#8E8E93" }} />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "#FFFFFF",
                      },
                    }}
                  />
                </Box>

                {/* Confirmar Nova Senha */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "#333333", mb: 0.75, display: "block" }}>
                    Confirmar nova senha
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type={mostrarConfirmarSenha ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                              edge="end"
                              size="small"
                            >
                              {mostrarConfirmarSenha ? (
                                <VisibilityOffOutlinedIcon fontSize="small" sx={{ color: "#8E8E93" }} />
                              ) : (
                                <VisibilityOutlinedIcon fontSize="small" sx={{ color: "#8E8E93" }} />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "#FFFFFF",
                      },
                    }}
                  />
                </Box>

                {/* Requisitos de senha */}
                <Box sx={{ pl: 0.5, py: 0.5 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: temMin8 ? "#0F6E56" : "#71717A",
                      fontWeight: temMin8 ? 600 : 400,
                      mb: 0.5,
                    }}
                  >
                    • Mínimo de 8 caracteres
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: temMaiuscula ? "#0F6E56" : "#71717A",
                      fontWeight: temMaiuscula ? 600 : 400,
                      mb: 0.5,
                    }}
                  >
                    • Pelo menos uma letra maiúscula
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: temNumero ? "#0F6E56" : "#71717A",
                      fontWeight: temNumero ? 600 : 400,
                    }}
                  >
                    • Pelo menos um número
                  </Typography>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !novaSenha || !confirmarSenha}
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
                  {loading ? <CircularProgress size={22} sx={{ color: "#FFFFFF" }} /> : "Redefinir senha"}
                </Button>

                <Box sx={{ textAlign: "center", mt: 0.5 }}>
                  <Link
                    href="/login"
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
