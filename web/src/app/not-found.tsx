"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import Container from "@mui/material/Container";

export default function NotFound() {
  return (
    <Box
      component="section"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5", // Fundo cinza claro
        textAlign: "center",
      }}
    >
      <Container maxWidth="sm">
        <Typography
          variant="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: "6rem", md: "8rem" },
            color: "#116A4D", // Verde da marca
            lineHeight: 1,
            mb: 2,
          }}
        >
          404
        </Typography>

        <Typography variant="h4" sx={{ fontWeight: 600, color: "#333", mb: 2 }}>
          Página não encontrada
        </Typography>

        <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
          A página que você está procurando não existe, foi removida ou está
          temporariamente indisponível.
        </Typography>

        <Button
          component={Link}
          href="/"
          variant="contained"
          size="large"
          sx={{
            bgcolor: "#116A4D",
            "&:hover": { bgcolor: "#0D533D" },
            textTransform: "none",
            borderRadius: 2,
            px: 4,
            py: 1.5,
          }}
        >
          Voltar para o início
        </Button>
      </Container>
    </Box>
  );
}
