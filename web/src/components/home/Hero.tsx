"use client";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Link from 'next/link';
import { APP_ROUTES } from '@/lib/routes';

export default function Hero() {
  return (
    <Box
      component="section"
      sx={{
        position: "relative",
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.default",
        backgroundImage: "url(/images/banner-fivo.jpg)",
        backgroundSize: "cover",
        // No mobile o recorte é mais estreito, então deslocamos o foco pra
        // direita pra enquadrar a mulher em vez de mostrar só o espaço vazio.
        backgroundPosition: { xs: "70% center", md: "center" },
        backgroundRepeat: "no-repeat",
        // fixed = efeito parallax; no mobile o Safari não lida bem com "fixed".
        backgroundAttachment: { xs: "scroll", md: "fixed" },
        minHeight: { xs: 480, md: 560 },
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Sobre a foto no mobile, um degradê claro por trás do texto garante
          leitura sem esconder a imagem (ela continua sendo o fundo). */}
      <Box
        aria-hidden
        sx={{
          display: { xs: "block", md: "none" },
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 45%, rgba(255,255,255,0.15) 100%)",
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative" }}>
        <Stack
          spacing={3}
          sx={{
            py: { xs: 8, md: 12 },
            alignItems: { xs: "center", md: "flex-start" },
            textAlign: { xs: "center", md: "left" },
            maxWidth: { xs: "100%", sm: 560, md: 640 },
            mx: { xs: "auto", md: 0 },
          }}
        >
          <Chip
            label="Selos de impacto social com transparência"
            sx={{
              bgcolor: "primary.light",
              color: "primary.main",
              fontWeight: 500,
              border: "1px solid",
              borderColor: "primary.main",
            }}
          />

          <Typography
            variant="h2"
            component="h1"
            sx={{ fontWeight: 700, fontSize: { xs: "2.25rem", md: "3rem" } }}
          >
            Transforme cada venda em uma doação que dá para conferir
          </Typography>

          <Typography
            variant="h6"
            component="p"
            color="text.secondary"
            sx={{ fontWeight: 400 }}
          >
            Sua empresa cria a campanha, escolhe a instituição e aplica o
            selo na embalagem. O consumidor escaneia e vê para onde o
            dinheiro foi.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ pt: 1, width: { xs: "100%", sm: "auto" } }}
          >
            <Button variant="contained" size="large" LinkComponent={Link} href={APP_ROUTES.public.cadastro}>
              Cadastrar minha empresa
            </Button>
            <Button
              variant="contained"
              size="large"
              color="inherit"
              LinkComponent={Link} href={APP_ROUTES.public.login}
              sx={{
                bgcolor: "common.white",
                color: "text.primary",
                boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
                "&:hover": {
                  bgcolor: "grey.100",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
                },
              }}
            >
              Ver campanhas ativas
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
