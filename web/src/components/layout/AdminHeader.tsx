"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import GrassRoundedIcon from "@mui/icons-material/GrassRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { APP_ROUTES } from "@/lib/routes";
import { useAuth } from "@/hooks/useAuth";

const navLinks = [
  { label: "Instituições", href: APP_ROUTES.admin.instituicoes },
  { label: "Empresas", href: APP_ROUTES.admin.empresas },
  { label: "Causas", href: APP_ROUTES.admin.causas },
  { label: "Campanhas", href: APP_ROUTES.admin.campanhas },
];

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    // logout() do contexto já chama DELETE /sessoes/atual e limpa o estado
    // local mesmo se a chamada falhar — só falta navegar pro login.
    void logout().then(() => router.push(APP_ROUTES.public.login));
  };

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
        {/* No celular o menu desce para uma segunda linha, abaixo da logo e do "Sair". */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr auto", md: "auto 1fr auto" },
            gridTemplateAreas: { xs: '"logo sair" "nav nav"', md: '"logo nav sair"' },
            alignItems: "center",
            columnGap: 2,
            rowGap: 1.25,
            py: 1.75,
          }}
        >
          <Box sx={{ gridArea: "logo", minWidth: 0 }}>
            <Link
              href={APP_ROUTES.admin.inicio}
              aria-label="Fivo — ir para o painel do admin"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 34,
                    height: 34,
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
                <Chip
                  label="Admin"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.625rem",
                    fontWeight: 600,
                    bgcolor: "primary.light",
                    color: "primary.main",
                    "& .MuiChip-label": { px: 0.75 },
                  }}
                />
              </Stack>
            </Link>
          </Box>

          <Stack
            component="nav"
            aria-label="Navegação do admin"
            direction="row"
            sx={{
              gridArea: "nav",
              gap: { xs: 3, md: 4 },
              flexWrap: "wrap",
              justifyContent: { xs: "flex-start", md: "center" },
            }}
          >
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  style={{ textDecoration: "none" }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      position: "relative",
                      py: 0.5,
                      fontWeight: active ? 700 : 500,
                      color: active ? "text.primary" : "text.secondary",
                      transition: "color 0.15s ease",
                      "&:hover": { color: "text.primary" },
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        right: active ? 0 : "100%",
                        bottom: -4,
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

          <Button
            onClick={handleLogout}
            startIcon={<LogoutRoundedIcon />}
            sx={{
              gridArea: "sair",
              color: "error.main",
              px: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            Sair
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
