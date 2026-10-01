"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import GrassRoundedIcon from "@mui/icons-material/GrassRounded";

export default function PublicSimpleHeader() {
  return (
    <Box
      component="header"
      sx={{
        borderBottom: "1px solid #EFEFEF",
        bgcolor: "#FFFFFF",
        py: 2,
      }}
    >
      <Container maxWidth="lg">
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  bgcolor: "#0F6E56",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                }}
              >
                <GrassRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="h6" component="span" sx={{ fontWeight: 700, color: "#1B1B19" }}>
                Fivo
              </Typography>
            </Stack>
          </Link>

          {/* Menus */}
          <Stack direction="row" spacing={3.5} sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
            <Link href="/home#como-funciona" style={{ textDecoration: "none" }}>
              <Typography variant="body2" sx={{ color: "#5F5E5A", "&:hover": { color: "#1B1B19" } }}>
                Como funciona
              </Typography>
            </Link>
            <Link href="/parceiros" style={{ textDecoration: "none" }}>
              <Typography variant="body2" sx={{ color: "#1B1B19", fontWeight: 600 }}>
                Empresas parceiras
              </Typography>
            </Link>
            <Link href="#" style={{ textDecoration: "none" }}>
              <Typography variant="body2" sx={{ color: "#5F5E5A", "&:hover": { color: "#1B1B19" } }}>
                Instituições
              </Typography>
            </Link>
          </Stack>

          {/* Botão Entrar */}
          <Button
            component={Link}
            href="/login"
            variant="outlined"
            size="small"
            sx={{
              borderColor: "#D1D5DB",
              color: "#1B1B19",
              borderRadius: 2,
              px: 2.5,
              py: 0.75,
              textTransform: "none",
              fontWeight: 600,
              "&:hover": {
                borderColor: "#9CA3AF",
                bgcolor: "#F9FAFB",
              },
            }}
          >
            Entrar
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
