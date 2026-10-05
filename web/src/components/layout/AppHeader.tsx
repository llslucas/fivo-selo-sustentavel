"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import GrassRoundedIcon from "@mui/icons-material/GrassRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import { mockEmpresaAtual } from "@/lib/campaign-wizard/types";
import { APP_ROUTES } from "@/lib/routes";

const navLinks = [
  { label: "Dashboard", href: APP_ROUTES.private.dashboard },
  { label: "Campanhas", href: APP_ROUTES.private.campanhas },
  { label: "Selos", href: APP_ROUTES.private.selos },
  { label: "Comprovantes", href: APP_ROUTES.private.comprovantes },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const userMenuOpen = Boolean(anchorEl);

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleCloseUserMenu();
    setMobileOpen(false);
    router.push(APP_ROUTES.public.login);
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
        <Stack
          direction="row"
          sx={{ py: 1.75, alignItems: "center", justifyContent: "space-between" }}
        >

          <Link
            href={APP_ROUTES.private.dashboard}
            style={{ color: "inherit", textDecoration: "none", flexShrink: 0 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box
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
            </Stack>
          </Link>

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

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexShrink: 0 }}>
       
            <Button
              onClick={handleOpenUserMenu}
              sx={{
                p: 0.5,
                borderRadius: 2,
                color: "text.primary",
                textTransform: "none",
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
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

              <Box sx={{ display: { xs: "none", md: "block" }, textAlign: "left" }}>
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

              <KeyboardArrowDownRoundedIcon
                sx={{
                  fontSize: 18,
                  color: "text.secondary",
                  display: { xs: "none", md: "block" },
                }}
              />
            </Button>


            <Menu
              anchorEl={anchorEl}
              open={userMenuOpen}
              onClose={handleCloseUserMenu}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    borderRadius: 2,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    border: 1,
                    borderColor: "divider",
                    p: 0.5,
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {mockEmpresaAtual.nome}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Painel da Empresa
                </Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem
                component={Link}
                href={APP_ROUTES.private.dashboard}
                onClick={handleCloseUserMenu}
              >
                Dashboard
              </MenuItem>
              <MenuItem
                component={Link}
                href={APP_ROUTES.private.campanhas}
                onClick={handleCloseUserMenu}
              >
                Campanhas
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                <ListItemIcon sx={{ color: "error.main", minWidth: 32 }}>
                  <LogoutRoundedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Sair da conta" />
              </MenuItem>
            </Menu>

            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label="abrir menu de navegação"
              sx={{
                display: { xs: "flex", md: "none" },
                p: 1,
                borderRadius: "10px",
                border: 1,
                borderColor: "divider",
                bgcolor: "background.default",
                color: "text.primary",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <MenuRoundedIcon sx={{ fontSize: 24, color: "#1B1B19" }} />
            </IconButton>
          </Stack>
        </Stack>
      </Container>

   
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
              p: 2.5,
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
              mb: 2.5,
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

          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: "action.hover",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: 2,
            }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              {mockEmpresaAtual.iniciais}
            </Avatar>
            <Box>
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
                  mt: 0.5,
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            </Box>
          </Box>

          <Button
            component={Link}
            href="/campanhas/nova"
            variant="contained"
            fullWidth
            startIcon={<AddRoundedIcon />}
            onClick={() => setMobileOpen(false)}
            sx={{
              bgcolor: "primary.main",
              color: "#ffffff",
              py: 1.2,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              fontSize: "0.95rem",
              boxShadow: "none",
              mb: 2.5,
              "&:hover": {
                bgcolor: "#0D533D",
              },
            }}
          >
            Nova campanha
          </Button>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={0.75}>
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Button
                  key={link.label}
                  component={Link}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    justifyContent: "flex-start",
                    py: 1.2,
                    px: 1.5,
                    borderRadius: 2,
                    color: active ? "primary.main" : "text.primary",
                    bgcolor: active ? "primary.light" : "transparent",
                    fontSize: "0.95rem",
                    fontWeight: active ? 700 : 500,
                    textTransform: "none",
                    "&:hover": {
                      bgcolor: active ? "primary.light" : "action.hover",
                    },
                  }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Stack>
        </Box>

        <Box sx={{ pt: 2, borderTop: 1, borderColor: "divider" }}>
          <Button
            onClick={handleLogout}
            fullWidth
            startIcon={<LogoutRoundedIcon />}
            sx={{
              justifyContent: "flex-start",
              color: "error.main",
              py: 1.2,
              px: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: "none",
              fontSize: "0.95rem",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            Sair da conta
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}
