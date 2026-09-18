import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
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
    icon: DescriptionOutlinedIcon,
    title: "Papéis claros",
    description:
      "A doação é feita pela empresa direto à instituição. A Fivo divulga e organiza.",
  },
];

function Bold({ children }: { children: React.ReactNode }) {
  return (
    <Box component="strong" sx={{ color: "text.primary", fontWeight: 700 }}>
      {children}
    </Box>
  );
}

export default function WhyTransparency() {
  return (
    <Box component="section" sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.default" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
        <Grid container spacing={{ xs: 6, md: 8 }} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 3 }}>
              Por que transparência importa
            </Typography>

            <Stack spacing={2} sx={{ mb: 5 }}>
              <Typography variant="body1" color="text.secondary">
                <Bold>Ações sociais</Bold> viraram argumento de venda comum, e
                o consumidor aprendeu a desconfiar. Sem prova, &ldquo;parte da
                nossa renda vai para caridade&rdquo; <Bold>não</Bold> significa
                nada.
              </Typography>
              <Typography variant="body1" color="text.secondary">
                A <Bold>Fivo</Bold> dá um endereço público e permanente para
                cada iniciativa: quem participa, qual a causa, qual a regra e
                quais comprovantes foram enviados.
              </Typography>
            </Stack>

            <Grid container spacing={4}>
              {points.map((point) => (
                <Grid key={point.title} size={{ xs: 12, sm: 4 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      bgcolor: "primary.light",
                      color: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 1.5,
                    }}
                  >
                    <point.icon sx={{ fontSize: 22 }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {point.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {point.description}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              component="img"
              src="/images/scan.jpg"
              alt="Cliente escaneando o QR Code do selo Fivo na embalagem do produto"
              sx={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: 4,
              }}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
