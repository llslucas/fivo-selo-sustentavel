"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import GrassRoundedIcon from "@mui/icons-material/GrassRounded";
import { mockEmpresaAtual } from "@/lib/campaign-wizard/types";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Campanhas", href: "/campanhas" },
  { label: "Selos", href: "/selos" },
  { label: "Comprovantes", href: "/comprovantes" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1100,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction="row"
          sx={{ py: 1.5, alignItems: "center", gap: 4 }}
        >
          {/* Logo */}
          <Link href="/" style={{ color: "inherit", textDecoration: "none", flexShrink: 0 }}>
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
              <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                Fivo
              </Typography>
            </Stack>
          </Link>

          {/* Nav links */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ flex: 1, display: { xs: "none", md: "flex" } }}
          >
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  style={{ textDecoration: "none" }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1,
                      fontWeight: active ? 700 : 400,
                      color: active ? "text.primary" : "text.secondary",
                      borderBottom: active ? "2px solid" : "2px solid transparent",
                      borderColor: active ? "primary.main" : "transparent",
                      transition: "color 0.15s ease",
                      "&:hover": { color: "text.primary" },
                    }}
                  >
                    {link.label}
                  </Typography>
                </Link>
              );
            })}
          </Stack>

          {/* Company avatar */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", ml: "auto", flexShrink: 0 }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 700,
                fontSize: "0.875rem",
              }}
            >
              {mockEmpresaAtual.iniciais}
            </Avatar>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {mockEmpresaAtual.nome}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Conta empresa
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
