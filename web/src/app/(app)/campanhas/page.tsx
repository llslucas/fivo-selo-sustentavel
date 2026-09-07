"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { CampaignCard, NewCampaignCard } from "@/components/dashboard/CampaignCard";

const listaCampanhas = [
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

export default function CampanhasPage() {
  return (
    <Box sx={{ bgcolor: "background.paper", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={4}>
          {/* Cabeçalho da página */}
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Todas as Campanhas
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Gerencie suas campanhas ativas, pausadas e encerradas.
              </Typography>
            </Box>
            <Button
              component={Link}
              href="/campanhas/nova"
              variant="contained"
              startIcon={<AddRoundedIcon />}
              sx={{ flexShrink: 0 }}
            >
              Nova campanha
            </Button>
          </Stack>

          {/* Grid de Campanhas */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ flexWrap: "wrap" }}>
            {listaCampanhas.map((campanha) => (
              <CampaignCard key={campanha.id} campaign={campanha} />
            ))}
            <NewCampaignCard />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
