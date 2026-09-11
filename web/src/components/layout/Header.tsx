"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import GrassRoundedIcon from "@mui/icons-material/GrassRounded";

const navLinks = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Empresas parceiras", href: "#empresas-parceiras" },
  { label: "Instituições", href: "#" },
];

// Distância de scroll (em px) a partir da qual o header deixa de ser transparente.
const SCROLL_THRESHOLD = 24;

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

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
      {/* Gradiente decorativo p/ dar contraste ao texto enquanto transparente.
          É mais alto que o próprio header de propósito, pra esmaecer bem devagar
          e não criar uma linha dura na borda de baixo. */}
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

          <Button
            variant={scrolled ? "outlined" : "contained"}
            color={scrolled ? "inherit" : "primary"}
            sx={{
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
        </Stack>
      </Container>
    </Box>
  );
}
