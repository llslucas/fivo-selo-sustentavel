"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
        p: { xs: 3, md: 5 },
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
        width: "50%"
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: "#333" }}>
        Entrar na plataforma
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        Acesse a área da sua empresa
      </Typography>

      <Box
        component="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void handleLogin();
        }}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {erro && <Alert severity="error">{erro}</Alert>}

        <Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
            E-mail corporativo
          </Typography>
          <TextField
            fullWidth
            placeholder="nome@empresa.com.br"
            variant="outlined"
            size="small"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(errosCampo.email)}
            helperText={errosCampo.email}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "#F9F9F9",
                borderRadius: 2,
              }
            }}
          />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
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
            size="small"
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
                bgcolor: "#F9F9F9",
                borderRadius: 2,
              }
            }}
          />
        </Box>


        <Box sx={{ display: "flex", justifyContent: "flex-end", textAlign: "right" }}>
          <Link href="/recuperar-senha" underline="none" sx={{ color: "#116A4D", fontSize: "0.875rem", fontWeight: 500, width: "100%" }}>
            Esqueci minha senha
          </Link>
        </Box>


        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
              py: 1
            }}
          >
            {loading ? <CircularProgress size={22} sx={{ color: "#fff" }} /> : "Entrar"}
          </Button>

          <Button
            variant="outlined"
            fullWidth
            LinkComponent={Link}
            href={APP_ROUTES.public.cadastro}
            sx={{
              color: "#333",
              borderColor: "#E0E0E0",
              '&:hover': { borderColor: "#CCC", bgcolor: "#FAFAFA" },
              textTransform: 'none',
              borderRadius: 2,
              py: 1
            }}
          >
            Cadastrar minha empresa
          </Button>
        </Box>

      </Box>
    </Box>
  );
}
