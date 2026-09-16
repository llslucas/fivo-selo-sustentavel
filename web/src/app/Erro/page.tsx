'use client';
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import Container from "@mui/material/Container";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export default function ErrorPage() {
  return (
    <Box
      component="section"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9f9f9", 
        textAlign: "center",
        p: 2
      }}
    >
      <Container maxWidth="sm">
        <WarningAmberIcon sx={{ fontSize: 80, color: "#D98032", mb: 2 }} />

        <Typography variant="h4" sx={{ fontWeight: 700, color: "#333", mb: 2 }}>
          Ops! Algo deu errado.
        </Typography>

        <Typography variant="body1" sx={{ color: "text.secondary", mb: 4, lineHeight: 1.6 }}>
          Tivemos um problema inesperado ao processar sua solicitação. 
          Por favor, tente novamente ou volte para a página inicial.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
          <Button
            variant="outlined"
            onClick={() => window.location.reload()}
            sx={{
              color: "#333",
              borderColor: "#E0E0E0",
              textTransform: "none",
              borderRadius: 2,
              px: 3,
              py: 1,
            }}
          >
            Tentar novamente
          </Button>

          <Button
            component={Link}
            href="/"
            variant="contained"
            sx={{
              bgcolor: "#116A4D",
              "&:hover": { bgcolor: "#0D533D" },
              textTransform: "none",
              borderRadius: 2,
              px: 3,
              py: 1,
            }}
          >
            Voltar ao Início
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
