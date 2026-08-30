import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

const footerLinks = [
  { label: "Sou uma instituição", href: "#" },
  { label: "Contato", href: "#" },
  { label: "Privacidade", href: "#" },
];

export default function Footer() {
  return (
    <Box component="footer" sx={{ bgcolor: "background.default" }}>
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{
            py: 3,
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body2" color="text.disabled">
            Fivo Lab · 2026
          </Typography>
          <Stack direction="row" spacing={3}>
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                <Typography
                  variant="body2"
                  color="text.disabled"
                  sx={{
                    transition: "color 0.15s ease",
                    "&:hover": { color: "text.primary" },
                  }}
                >
                  {link.label}
                </Typography>
              </Link>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
