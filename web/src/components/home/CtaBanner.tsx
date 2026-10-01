import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";

export default function CtaBanner() {
  return (
    <Box component="section">
      <Container maxWidth="md">
        <Stack
          spacing={2}
          sx={{ py: { xs: 8, md: 10 }, alignItems: "center", textAlign: "center" }}
        >
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
            Pronto para começar?
          </Typography>
          <Typography variant="body1" color="text.secondary">
            O cadastro leva poucos minutos e a primeira campanha pode ser
            criada no mesmo dia.
          </Typography>
          <Link href="/cadastro" style={{ textDecoration: "none" }}>
            <Button
              variant="contained"
              size="large"
              sx={{ mt: 1 }}
            >
              Cadastrar minha empresa
            </Button>
          </Link>
        </Stack>
      </Container>
    </Box>
  );
}
