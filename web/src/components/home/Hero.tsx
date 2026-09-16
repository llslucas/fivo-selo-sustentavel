import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";

export default function Hero() {
  return (
    <Box
      component="section"
      sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}
    >
      <Container maxWidth="md">
        <Stack
          spacing={3}
          sx={{ py: { xs: 8, md: 12 }, alignItems: "center", textAlign: "center" }}
        >
          <Chip
            label="Selos de impacto social com transparência"
            sx={{
              bgcolor: "primary.light",
              color: "primary.main",
              fontWeight: 500,
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

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ pt: 1 }}>
            <Button variant="contained" size="large">
              Cadastrar minha empresa
            </Button>
            <Button
              variant="outlined"
              size="large"
              color="inherit"
              sx={{
                borderColor: "divider",
                "&:hover": {
                  borderColor: "text.secondary",
                  bgcolor: "action.hover",
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
