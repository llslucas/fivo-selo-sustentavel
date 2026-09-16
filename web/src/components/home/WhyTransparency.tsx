import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import BalanceOutlinedIcon from "@mui/icons-material/BalanceOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

const points: { icon: SvgIconComponent; title: string; description: string }[] = [
  {
    icon: VisibilityOutlinedIcon,
    title: "Público e sem cadastro",
    description: "Qualquer pessoa acessa a página da campanha pelo QR Code.",
  },
  {
    icon: LinkOutlinedIcon,
    title: "Link permanente",
    description: "O selo impresso continua funcionando anos depois.",
  },
  {
    icon: BalanceOutlinedIcon,
    title: "Papéis claros",
    description:
      "A doação é feita pela empresa direto à instituição. A Fivo divulga e organiza.",
  },
];

export default function WhyTransparency() {
  return (
    <Box component="section" sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              Por que transparência importa
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Typography variant="body1" color="text.secondary">
                Ações sociais viraram argumento de venda comum, e o
                consumidor aprendeu a desconfiar. Sem prova, &ldquo;parte
                da nossa renda vai para caridade&rdquo; não significa
                nada.
              </Typography>
              <Typography variant="body1" color="text.secondary">
                A Fivo dá um endereço público e permanente para cada
                iniciativa: quem participa, qual a causa, qual a regra e
                quais comprovantes foram enviados.
              </Typography>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                bgcolor: "background.paper",
                borderRadius: 3,
                p: 4,
              }}
            >
              <Stack spacing={1}>
                {points.map((point) => (
                  <Stack
                    key={point.title}
                    direction="row"
                    spacing={2}
                    sx={{
                      p: 1.5,
                      m: -1.5,
                      borderRadius: 2,
                      transition: "background-color 0.2s ease",
                      "&:hover": { bgcolor: "background.default" },
                      "&:hover .point-icon": { transform: "scale(1.1)" },
                    }}
                  >
                    <point.icon
                      className="point-icon"
                      sx={{ color: "primary.main", mt: 0.25, transition: "transform 0.2s ease" }}
                    />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {point.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {point.description}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
