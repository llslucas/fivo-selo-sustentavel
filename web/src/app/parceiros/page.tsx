"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Link from "next/link";
import PublicSimpleHeader from "@/components/layout/PublicSimpleHeader";
import Footer from "@/components/layout/Footer";
import { mockPartnerCompanies } from "@/lib/mockPartners";

export default function ParceirosPage() {
  const [busca, setBusca] = useState("");

  const parceirosFiltrados = mockPartnerCompanies.filter((parceiro) =>
    parceiro.name.toLowerCase().includes(busca.toLowerCase()) ||
    parceiro.segment.toLowerCase().includes(busca.toLowerCase()) ||
    (parceiro.location && parceiro.location.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <Box sx={{ bgcolor: "#FFFFFF", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicSimpleHeader />

      <Box component="main" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          {/* Título e Subtítulo */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: "#1B1B19", mb: 1 }}>
              Empresas parceiras
            </Typography>
            <Typography variant="body1" sx={{ color: "#5F5E5A" }}>
              Conheça as empresas que estão gerando impacto social através da Fivo.
            </Typography>
          </Box>

          {/* Barra de busca e Contador */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              mb: 4,
              gap: 2,
            }}
          >
            <TextField
              size="small"
              placeholder="Buscar empresa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              sx={{
                maxWidth: { sm: 300 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#FFFFFF",
                },
              }}
            />
            <Typography variant="body2" sx={{ color: "#5F5E5A", textAlign: { xs: "left", sm: "right" } }}>
              312 empresas cadastradas
            </Typography>
          </Stack>

          {/* Grid de Cards dos Parceiros */}
          <Grid container spacing={3}>
            {parceirosFiltrados.map((empresa) => (
              <Grid key={empresa.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box
                  sx={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 3,
                    p: 3,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    bgcolor: "#FFFFFF",
                    transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
                    "&:hover": {
                      borderColor: "#0F6E56",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Box>
                    {/* Header do card: avatar + nome + segmento */}
                    <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: "center" }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          bgcolor: empresa.avatarColor,
                          color: "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "1rem",
                          flexShrink: 0,
                        }}
                      >
                        {empresa.initials}
                      </Box>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1B1B19", lineHeight: 1.25 }}>
                          {empresa.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#71717A" }}>
                          {empresa.segment}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Métricas: Campanhas e Doados */}
                    <Box sx={{ display: "flex", gap: 5, mb: 3 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F6E56", lineHeight: 1 }}>
                          {empresa.campaignsCount}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#71717A" }}>
                          campanhas
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F6E56", lineHeight: 1 }}>
                          {empresa.totalDonatedFormatted}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#71717A" }}>
                          doado
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Botão Ver perfil */}
                  <Button
                    component={Link}
                    href={`/parceiros/${empresa.slug}`}
                    variant="outlined"
                    fullWidth
                    sx={{
                      borderColor: "#E5E7EB",
                      color: "#1B1B19",
                      borderRadius: 2,
                      py: 1,
                      textTransform: "none",
                      fontWeight: 600,
                      "&:hover": {
                        borderColor: "#0F6E56",
                        color: "#0F6E56",
                        bgcolor: "#F4FAF7",
                      },
                    }}
                  >
                    Ver perfil
                  </Button>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
