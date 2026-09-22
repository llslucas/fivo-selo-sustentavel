'use client'; 
import { APP_ROUTES } from '@/lib/routes';
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import { useState } from "react";

export default function CompLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = () => {
    // Aqui você pode adicionar a lógica de autenticação, como enviar os dados para o backend
    console.log('Email:', email);
    console.log('Senha:', senha);
  };

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

      <Box component="form" noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#1B1B19", mb: 0.75 }}>
            E-mail corporativo
          </Typography>
          <TextField
            fullWidth
            placeholder="nome@empresa.com.br"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            type="password"
            placeholder="••••••••"
            variant="outlined"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
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
            variant="contained" 
            fullWidth 
            component={NextLink}
            href={APP_ROUTES.private.dashboard}
            onClick={handleLogin}
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
            Entrar
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