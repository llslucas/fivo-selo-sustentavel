import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import LoyaltyOutlinedIcon from "@mui/icons-material/LoyaltyOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

const steps: {
  icon: SvgIconComponent;
  accent?: boolean;
  title: string;
  description: string;
}[] = [
  {
    icon: StorefrontOutlinedIcon,
    title: "1. Crie a campanha",
    description:
      "Escolha a instituição e defina quanto será doado por unidade vendida.",
  },
  {
    icon: LoyaltyOutlinedIcon,
    title: "2. Gere o selo",
    description:
      "Escolha um dos modelos, adicione sua logo e baixe o arquivo com QR Code.",
  },
  {
    icon: Inventory2OutlinedIcon,
    title: "3. Aplique no produto",
    description: "Use na embalagem, no rótulo ou em materiais digitais.",
  },
  {
    icon: FactCheckOutlinedIcon,
    accent: true,
    title: "4. Envie o comprovante",
    description:
      "Faça a doação e publique o comprovante na página da campanha.",
  },
];

export default function HowItWorks() {
  return (
    <Box
      id="como-funciona"
      component="section"
      sx={{ borderBottom: 1, borderColor: "divider" }}
    >
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
          Como funciona
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1, mb: 5 }}>
          Quatro passos, do cadastro à prateleira.
        </Typography>

        <Grid container spacing={3}>
          {steps.map((step) => (
            <Grid key={step.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 3,
                  p: 3,
                  height: "100%",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                  "&:hover": {
                    borderColor: step.accent ? "secondary.main" : "primary.main",
                    boxShadow: 2,
                    transform: "translateY(-3px)",
                    "& .step-icon": {
                      transform: "scale(1.08)",
                    },
                  },
                }}
              >
                <Box
                  className="step-icon"
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "12px",
                    bgcolor: step.accent ? "secondary.light" : "primary.light",
                    color: step.accent ? "secondary.dark" : "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                    transition: "transform 0.2s ease",
                  }}
                >
                  <step.icon fontSize="small" />
                </Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
