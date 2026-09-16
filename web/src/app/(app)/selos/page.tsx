"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import SealPreviewPanel from "@/components/campaign-wizard/SealPreviewPanel";
import { mockEmpresaAtual } from "@/lib/campaign-wizard/types";

const selosMock = [
  {
    id: "selo-1",
    campanha: "Café que alimenta",
    modelo: "Clássico",
    dataCriacao: "12/02/2026",
  },
  {
    id: "selo-2",
    campanha: "Grão com Propósito",
    modelo: "Escudo",
    dataCriacao: "28/02/2026",
  },
];

export default function SelosPage() {
  return (
    <Box sx={{ bgcolor: "background.paper", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={4}>
          {/* Cabeçalho */}
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Meus Selos
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gerencie e baixe os selos gerados para as suas campanhas de impacto.
            </Typography>
          </Box>

          {/* Grid de Selos */}
          <Grid container spacing={3}>
            {selosMock.map((selo) => (
              <Grid key={selo.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 3,
                    bgcolor: "background.default",
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <Box sx={{ width: "100%", maxWidth: 220 }}>
                    <SealPreviewPanel
                      campaignName={selo.campanha}
                      initials={mockEmpresaAtual.iniciais}
                      avatarColor={mockEmpresaAtual.avatarColor}
                    />
                  </Box>
                  <Box sx={{ width: "100%", textAlign: "center" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {selo.campanha}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Modelo: {selo.modelo} · Criado em {selo.dataCriacao}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
                    <Button variant="outlined" size="small" fullWidth color="inherit">
                      Baixar PNG
                    </Button>
                    <Button variant="outlined" size="small" fullWidth color="inherit">
                      Baixar SVG
                    </Button>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
