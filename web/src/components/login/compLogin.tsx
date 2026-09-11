'use client'; 
import { APP_ROUTES } from '@/lib/routes';
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import { useState } from "react";

export default function CompLogin() {
const [email, setEmail] = useState('');
const [senha, setSenha] = useState('');

  return (
    <Box
      sx={{
        backgroundColor: "#ffffff",
        p: { xs: 4, md: 8 },
        flexDirection: "column",
        justifyContent: "center",
        height: "100%",
        width: "50%"
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5, color: "#333" }}>
        Entrar na plataforma
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
        Acesse a área da sua empresa
      </Typography>

      <Box component="form" noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        <Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
            E-mail corporativo
          </Typography>
          <TextField
            fullWidth
            placeholder="nome@empresa.com.br"
            variant="outlined"
            size="small"
            onChange={(e) => setEmail(e.target.value)}
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
            type="password"
            placeholder="••••••••"
            variant="outlined"
            onChange={(e) => setSenha(e.target.value)}
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "#F9F9F9",
                borderRadius: 2,
              }
            }}
          />
        </Box>

      
        <Box sx={{ display: "flex", justifyContext: "flex-end", textAlign: "right" }}>
          <Link href="/esqueci-minha-senha" underline="none" sx={{ color: "#116A4D", fontSize: "0.875rem", fontWeight: 500, width: "100%" }}>
            Esqueci minha senha
          </Link>
        </Box>

 
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button 
            variant="contained" 
            fullWidth 
            LinkComponent={Link}
            href={APP_ROUTES.private.dashboard}
            sx={{ 
              bgcolor: "#116A4D", 
              '&:hover': { bgcolor: "#0D533D" },
              textTransform: 'none',
              borderRadius: 2,
              py: 1.2
            }}
          >
            Entrar
          </Button>
          
          <Button 
            variant="outlined" 
            fullWidth 
            sx={{ 
              color: "#333",
              borderColor: "#E0E0E0",
              '&:hover': { borderColor: "#CCC", bgcolor: "#FAFAFA" },
              textTransform: 'none',
              borderRadius: 2,
              py: 1.2
            }}
          >
            Cadastrar minha empresa
          </Button>
        </Box>

      </Box>
    </Box>
  );
}