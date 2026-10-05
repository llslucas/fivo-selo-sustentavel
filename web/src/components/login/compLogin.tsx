"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { APP_ROUTES } from "@/lib/routes";
import { ApiError, login } from "@/lib/api";

export default function CompLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [errosCampo, setErrosCampo] = useState<Record<string, string>>({});

  async function handleLogin() {
    setErro(null);
    setErrosCampo({});
    setLoading(true);
    try {
      await login(email, senha);
      router.push(APP_ROUTES.private.dashboard);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrosCampo(e.fieldErrors);
        setErro(
          e.status === 401
            ? "E-mail ou senha incorretos."
            : e.status === 429
              ? e.message
              : e.message,
        );
      } else {
        setErro("Não foi possível entrar. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        backgroundColor: "#ffffff",
        p: { xs: 3.5, sm: 4, md: 7 },
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: { xs: "100%", md: "50%" },
        flex: 1,
      }}
    >
      <Typography
        component="h2"
        sx={{
          fontWeight: 700,
          fontSize: { xs: "1.35rem", md: "1.5rem" },
          mb: 0.5,
          color: "#1B1B19",
          letterSpacing: "-0.01em",
        }}
      >
        Entrar na plataforma
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3.5 }}>
        Acesse a área da sua empresa
      </Typography>

      <Box
        component="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void handleLogin();
        }}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        {erro && <Alert severity="error">{erro}</Alert>}

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#1B1B19", mb: 0.75 }}>
            E-mail corporativo
          </Typography>
          <TextField
            fullWidth
            placeholder="nome@empresa.com.br"
            variant="outlined"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(errosCampo.email)}
            helperText={errosCampo.email}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "#FFFFFF",
                borderRadius: 2,
                "& fieldset": {
                  borderColor: "#E5E7EB",
                },
                "&:hover fieldset": {
                  borderColor: "#D1D5DB",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#116A4D",
                },
              },
              "& .MuiOutlinedInput-input": {
                py: 1.3,
                fontSize: "0.95rem",
              },
            }}
          />
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#1B1B19", mb: 0.75, fontSize: "0.875rem" }}>
            Senha
          </Typography>
          <TextField
            fullWidth
            type={mostrarSenha ? "text" : "password"}
            placeholder="••••••••"
            variant="outlined"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            error={Boolean(errosCampo.senha)}
            helperText={errosCampo.senha}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setMostrarSenha((v) => !v)}
                      edge="end"
                      size="small"
                      aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {mostrarSenha ? (
                        <VisibilityOffRoundedIcon fontSize="small" />
                      ) : (
                        <VisibilityRoundedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "#FFFFFF",
                borderRadius: 2,
                "& fieldset": {
                  borderColor: "#E5E7EB",
                },
                "&:hover fieldset": {
                  borderColor: "#D1D5DB",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#116A4D",
                },
              },
              "& .MuiOutlinedInput-input": {
                py: 1.3,
                fontSize: "0.95rem",
              },
            }}
          />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Link
            component={NextLink}
            href="/esqueci-minha-senha"
            underline="none"
            sx={{
              color: "#116A4D",
              fontSize: "0.875rem",
              fontWeight: 600,
              "&:hover": { textDecoration: "underline" },
            }}
          >
            Esqueci minha senha
          </Link>
        </Box>

        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading || !email || !senha}
            sx={{
              bgcolor: "#116A4D",
              '&:hover': { bgcolor: "#0D533D" },
              textTransform: 'none',
              borderRadius: 2,
              py: 1.3,
              fontSize: "0.95rem",
              fontWeight: 600,
              boxShadow: "none",
            }}
          >
            {loading ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Entrar"}
          </Button>

          <Button
            variant="outlined"
            fullWidth
            component={NextLink}
            href={APP_ROUTES.public.cadastro}
            sx={{
              color: "#1B1B19",
              borderColor: "#E5E7EB",
              bgcolor: "#ffffff",
              '&:hover': { borderColor: "#D1D5DB", bgcolor: "#FAFAFA" },
              textTransform: 'none',
              borderRadius: 2,
              py: 1.3,
              fontSize: "0.95rem",
              fontWeight: 600,
            }}
          >
            Cadastrar minha empresa
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
