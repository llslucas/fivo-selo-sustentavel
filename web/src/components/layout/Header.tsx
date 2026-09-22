"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import Link from "next/link";
import GrassRoundedIcon from "@mui/icons-material/GrassRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { APP_ROUTES } from "@/lib/routes";

const navLinks = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Empresas parceiras", href: "#empresas-parceiras" },
  { label: "Instituições", href: "#" },
];

const SCROLL_THRESHOLD = 24;

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 1100, // = theme.zIndex.appBar
        bgcolor: scrolled ? "background.default" : "transparent",
        borderBottom: scrolled ? 1 : 0,
        borderColor: "divider",
        transition: "background-color 0.25s ease",
      }}
    >
      
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 160,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0))",
          opacity: scrolled ? 0 : 1,
          transition: "opacity 0.25s ease",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      <Container maxWidth="lg" sx={{ position: "relative" }}>
        <Stack
          direction="row"
          sx={{ py: 2, alignItems: "center", justifyContent: "space-between" }}
        >
          <Link
            href="/"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                transition: "opacity 0.15s ease",
                "&:hover": { opacity: 0.8 },
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "10px",
                  bgcolor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "primary.contrastText",
                }}
              >
                <GrassRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 700,
                  color: scrolled ? "text.primary" : "common.white",
                  transition: "color 0.25s ease",
                }}
              >
                Fivo
              </Typography>
            </Stack>
          </Link>

         
          <Stack
            direction="row"
            spacing={4}
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    position: "relative",
                    py: 0.5,
                    color: scrolled ? "text.secondary" : "rgba(255,255,255,0.85)",
                    transition: "color 0.25s ease",
                    "&:hover": { color: scrolled ? "text.primary" : "common.white" },
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      right: "100%",
                      bottom: 0,
                      height: "2px",
                      bgcolor: scrolled ? "primary.main" : "common.white",
                      transition: "right 0.2s ease, background-color 0.25s ease",
                    },
                    "&:hover::after": { right: 0 },
                  }}
                >
                  {link.label}
                </Typography>
              </Link>
            ))}
          </Stack>

          {/* Botão Entrar Desktop */}
          <Button
            component={Link}
            href={APP_ROUTES.public.login}
            variant={scrolled ? "outlined" : "contained"}
            color={scrolled ? "inherit" : "primary"}
            sx={{
              display: { xs: "none", md: "inline-flex" },
              transition: "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease",
              ...(scrolled
                ? {
                    color: "text.primary",
                    borderColor: "divider",
                    "&:hover": { borderColor: "text.secondary", bgcolor: "action.hover" },
                  }
                : {
                    boxShadow: "none",
                    "&:hover": { boxShadow: "none" },
                  }),
            }}
          >
            Entrar
          </Button>

          {/* Botão Hambúrguer Mobile */}
          <IconButton
            onClick={() => setMobileOpen(true)}
            aria-label="abrir menu de navegação"
            sx={{
              display: { xs: "flex", md: "none" },
              p: 1,
              borderRadius: "10px",
              border: 1,
              borderColor: scrolled ? "divider" : "rgba(255, 255, 255, 0.18)",
              color: "text.primary",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: scrolled ? "action.hover" : "#FFFFFF",
              },
            }}
          >
            <MenuRoundedIcon sx={{ fontSize: 24, color: "#1B1B19" }} />
          </IconButton>
        </Stack>
      </Container>

      {/* Drawer Mobile */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: "82%",
              maxWidth: 320,
              bgcolor: "background.default",
              p: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            },
          },
        }}
      >
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "10px",
                  bgcolor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "primary.contrastText",
                }}
              >
                <GrassRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary" }}>
                Fivo
              </Typography>
            </Stack>

            <IconButton
              onClick={() => setMobileOpen(false)}
              aria-label="fechar menu"
              sx={{
                borderRadius: "10px",
                border: 1,
                borderColor: "divider",
                color: "text.primary",
                p: 0.75,
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          {/* Itens de navegação */}
          <Stack spacing={1}>
            {navLinks.map((link) => (
              <Button
                key={link.label}
                component={Link}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                sx={{
                  justifyContent: "flex-start",
                  py: 1.25,
                  px: 1.5,
                  borderRadius: 2,
                  color: "text.primary",
                  fontSize: "1rem",
                  fontWeight: 500,
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: "action.hover",
                    color: "primary.main",
                  },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>
        </Box>

        {/* Ações do rodapé do Drawer */}
        <Box sx={{ pt: 3, borderTop: 1, borderColor: "divider", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Button
            component={Link}
            href={APP_ROUTES.public.login}
            variant="contained"
            fullWidth
            onClick={() => setMobileOpen(false)}
            sx={{
              bgcolor: "primary.main",
              color: "#ffffff",
              py: 1.25,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              fontSize: "0.95rem",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#0D533D",
              },
            }}
          >
            Entrar
          </Button>

          <Button
            component={Link}
            href={APP_ROUTES.public.cadastro}
            variant="outlined"
            fullWidth
            onClick={() => setMobileOpen(false)}
            sx={{
              borderColor: "divider",
              color: "text.primary",
              py: 1.25,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              fontSize: "0.95rem",
              "&:hover": {
                borderColor: "text.secondary",
                bgcolor: "action.hover",
              },
            }}
          >
            Cadastrar minha empresa
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}
