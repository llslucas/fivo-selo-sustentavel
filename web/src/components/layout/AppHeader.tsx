"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
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
          sx={{ py: 2, alignItems: "center", justifyContent: "space-between" }}
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
            spacing={4}
            sx={{ display: { xs: "none", md: "flex" } }}
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
                      position: "relative",
                      py: 0.5,
                      fontWeight: active ? 700 : 400,
                      color: active ? "text.primary" : "text.secondary",
                      transition: "color 0.15s ease",
                      "&:hover": { color: "text.primary" },
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        right: active ? 0 : "100%",
                        bottom: 0,
                        height: "2px",
                        bgcolor: "primary.main",
                        transition: "right 0.2s ease",
                      },
                      "&:hover::after": { right: 0 },
                    }}
                  >
                    {link.label}
                  </Typography>
                </Link>
              );
            })}
          </Stack>

          {/* Company avatar */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexShrink: 0 }}>
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
              <Chip
                label="Conta empresa"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.625rem",
                  fontWeight: 600,
                  bgcolor: "primary.light",
                  color: "primary.main",
                  mt: 0.25,
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
