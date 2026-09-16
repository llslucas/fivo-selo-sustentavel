"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { StatCard } from "@/components/dashboard/StatCard";
import { CampaignCard, NewCampaignCard } from "@/components/dashboard/CampaignCard";
import { mockEmpresaAtual } from "@/lib/campaign-wizard/types";

// Dados mock — serão substituídos por dados reais quando houver backend
const stats = [
  { value: "2", label: "Campanhas ativas" },
  { value: "R$ 6.800", label: "Doados divulgado" },
  { value: "3", label: "Selos gerados" },
  { value: "1.200", label: "Acessos à página pública" },
];

const campanhasRecentes = [
  {
    id: "cafe-que-alimenta",
    nome: "Café que alimenta",
    status: "Ativa" as const,
    apoio: "Apoiando Casa do Bem - Alimentação",
    valorDoado: "R$ 6.800",
    qrInfo: "QR gerado · 1 comprovante",
  },
  {
    id: "grao-com-proposito",
    nome: "Grão com Propósito",
    status: "Ativa" as const,
    apoio: "Apoiando Casa do Bem - Educação",
    valorDoado: "R$ 1.240",
    qrInfo: "QR gerado · 1 comprovante",
  },
];

export default function DashboardView() {
  return (
    <Box sx={{ bgcolor: "background.paper", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={4}>
          {/* Cabeçalho */}
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Olá, {mockEmpresaAtual.nome}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Aqui, está um resumo das suas campanhas de impacto social.
              </Typography>
            </Box>
            <Button
              component={Link}
              href="/campanhas/nova"
              variant="contained"
              startIcon={<AddRoundedIcon />}
              sx={{ flexShrink: 0 }}
            >
              + Nova campanha
            </Button>
          </Stack>

          {/* Cards de métricas */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ flexWrap: "wrap" }}
          >
            {stats.map((stat) => (
              <StatCard key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </Stack>

          {/* Alerta de comprovante pendente */}
          <Box
            sx={{
              border: 1,
              borderColor: "#F0D9A8",
              bgcolor: "#FAEEDA",
              borderRadius: 2,
              px: 3,
              py: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography variant="body2">
              <Typography
                component="span"
                variant="body2"
                sx={{ fontWeight: 700, color: "secondary.dark" }}
              >
                Comprovante de fevereiro pendente.
              </Typography>{" "}
              <Typography component="span" variant="body2" sx={{ color: "secondary.dark" }}>
                A campanha &quot;Café que alimenta&quot; está sem o comprovante do mês.
              </Typography>
            </Typography>
            <Button
              component={Link}
              href="/campanhas/nova"
              variant="contained"
              size="small"
              startIcon={<AddRoundedIcon />}
              sx={{ flexShrink: 0 }}
            >
              + Nova campanha
            </Button>
          </Box>

          {/* Campanhas recentes */}
          <Box>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Campanhas recentes
              </Typography>
              <Link href="/campanhas" style={{ textDecoration: "none" }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: "primary.main",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Ver todas →
                </Typography>
              </Link>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {campanhasRecentes.map((campanha) => (
                <CampaignCard key={campanha.id} campaign={campanha} />
              ))}
              <NewCampaignCard />
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
