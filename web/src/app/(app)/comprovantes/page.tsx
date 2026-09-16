"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

const comprovantesMock = [
  {
    id: "comp-1",
    mes: "Fevereiro / 2026",
    campanha: "Café que alimenta",
    status: "Pendente" as const,
    valor: "R$ 6.800",
  },
  {
    id: "comp-2",
    mes: "Janeiro / 2026",
    campanha: "Café que alimenta",
    status: "Enviado" as const,
    valor: "R$ 5.200",
  },
];

export default function ComprovantesPage() {
  return (
    <Box sx={{ bgcolor: "background.paper", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={4}>
          {/* Cabeçalho */}
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
              Comprovantes de Doação
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Envie e consulte os comprovantes bancários mensais das doações realizadas.
            </Typography>
          </Box>

          {/* Lista de Comprovantes */}
          <Stack spacing={2}>
            {comprovantesMock.map((comp) => (
              <Box
                key={comp.id}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "background.default",
                  p: 3,
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {comp.mes}
                    </Typography>
                    <Chip
                      icon={
                        comp.status === "Pendente" ? (
                          <WarningAmberRoundedIcon sx={{ fontSize: "16px !important" }} />
                        ) : (
                          <CheckCircleRoundedIcon sx={{ fontSize: "16px !important" }} />
                        )
                      }
                      label={comp.status}
                      size="small"
                      sx={{
                        bgcolor: comp.status === "Pendente" ? "secondary.light" : "primary.light",
                        color: comp.status === "Pendente" ? "secondary.dark" : "primary.main",
                        fontWeight: 600,
                      }}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Campanha: {comp.campanha} · Valor arrecadado: {comp.valor}
                  </Typography>
                </Box>

                <Button
                  variant={comp.status === "Pendente" ? "contained" : "outlined"}
                  color={comp.status === "Pendente" ? "primary" : "inherit"}
                  startIcon={<FileUploadRoundedIcon />}
                  size="small"
                  sx={{ flexShrink: 0 }}
                >
                  {comp.status === "Pendente" ? "Enviar comprovante" : "Ver comprovante"}
                </Button>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
