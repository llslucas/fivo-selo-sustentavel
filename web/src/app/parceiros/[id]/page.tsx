"use client";

import { use } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import PublicSimpleHeader from "@/components/layout/PublicSimpleHeader";
import Footer from "@/components/layout/Footer";
import { mockPartnerCompanies } from "@/lib/mockPartners";

interface PartnerProfileProps {
  params: Promise<{ id: string }>;
}

export default function PartnerDetailPage({ params }: PartnerProfileProps) {
  const resolvedParams = use(params);
  const empresa = mockPartnerCompanies.find(
    (p) => p.slug === resolvedParams.id || p.id === resolvedParams.id
  );
  if (!empresa) notFound();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getTagColor = (categoria: string) => {
    switch (categoria.toLowerCase()) {
      case "meio ambiente":
        return { bg: "#E1F5EE", text: "#0F6E56" };
      case "educação":
        return { bg: "#EEF2FF", text: "#3730A3" };
      case "saneamento":
        return { bg: "#E6F4EA", text: "#137333" };
      default:
        return { bg: "#F3F4F6", text: "#374151" };
    }
  };

  return (
    <Box sx={{ bgcolor: "#FFFFFF", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicSimpleHeader />

      <Box component="main" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          {/* Header da Empresa */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            sx={{ alignItems: { xs: "flex-start", sm: "flex-start" }, mb: 5 }}
          >
            {/* Avatar Grande */}
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: empresa.avatarColor,
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "1.5rem",
                flexShrink: 0,
              }}
            >
              {empresa.initials}
            </Box>

            {/* Informações da Empresa */}
            <Box sx={{ maxWidth: 700 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: "#1B1B19", mb: 1 }}>
                {empresa.corporateName || empresa.name}
              </Typography>
              <Typography variant="body1" sx={{ color: "#5F5E5A", mb: 3, lineHeight: 1.5 }}>
                {empresa.description}
              </Typography>

              {/* 3 Métricas: total doado, campanhas ativas, selos emitidos */}
              <Box sx={{ display: "flex", gap: { xs: 4, sm: 6 }, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#0F6E56", lineHeight: 1.1 }}>
                    {formatCurrency(empresa.totalDonated)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#71717A" }}>
                    total doado
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#0F6E56", lineHeight: 1.1 }}>
                    {empresa.campaignsCount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#71717A" }}>
                    campanhas ativas
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "#0F6E56", lineHeight: 1.1 }}>
                    {empresa.sealsIssuedCount || 312}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#71717A" }}>
                    selos emitidos
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Stack>

          {/* Seção Campanhas desta empresa */}
          <Box sx={{ mt: 6 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: "#1B1B19", mb: 3 }}>
              Campanhas desta empresa
            </Typography>

            <Grid container spacing={3}>
              {(empresa.campaigns || []).map((camp) => {
                const tag = getTagColor(camp.categoria);
                const progresso = Math.min(Math.round((camp.arrecadado / camp.meta) * 100), 100);

                return (
                  <Grid key={camp.id} size={{ xs: 12, sm: 6, md: 4 }}>
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
                        transition: "border-color 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          borderColor: "#0F6E56",
                          boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
                        },
                      }}
                    >
                      <Box>
                        {/* Tag Categoria */}
                        <Chip
                          label={camp.categoria}
                          size="small"
                          sx={{
                            bgcolor: tag.bg,
                            color: tag.text,
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            borderRadius: 1.5,
                            height: 24,
                            mb: 2,
                            "& .MuiChip-label": { px: 1.5 },
                          }}
                        />

                        {/* Nome da Campanha */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1B1B19", mb: 2 }}>
                          {camp.nome}
                        </Typography>

                        {/* Barra de Progresso Verde */}
                        <Box sx={{ width: "100%", mb: 1.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={progresso}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              bgcolor: "#E5E7EB",
                              "& .MuiLinearProgress-bar": {
                                bgcolor: "#0F6E56",
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Box>

                        {/* Metas e Arrecadação */}
                        <Typography variant="body2" sx={{ color: "#71717A", mb: 3 }}>
                          {formatCurrency(camp.arrecadado)} de {formatCurrency(camp.meta)}
                        </Typography>
                      </Box>

                      {/* Link Ver campanha */}
                      <Link
                        href={`/campanhas`}
                        style={{
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#0F6E56",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                        }}
                      >
                        Ver campanha
                        <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
                      </Link>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
