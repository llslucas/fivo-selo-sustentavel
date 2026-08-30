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

export default function Header() {
  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1100, // theme.zIndex.appBar — valor fixo p/ evitar função em sx (Server Component)
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
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    position: "relative",
                    py: 0.5,
                    transition: "color 0.15s ease",
                    "&:hover": { color: "text.primary" },
                    "&::after": {
                      content: '""',
                      position: "absolute",
                      left: 0,
                      right: "100%",
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
            ))}
          </Stack>

          <Button
            variant="outlined"
            color="inherit"
            sx={{
              borderColor: "divider",
              transition: "border-color 0.15s ease, background-color 0.15s ease",
              "&:hover": {
                borderColor: "text.secondary",
                bgcolor: "action.hover",
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
