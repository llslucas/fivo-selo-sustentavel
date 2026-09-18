"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import HexagonOutlinedIcon from "@mui/icons-material/HexagonOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import type { CampaignWizardData } from "@/lib/campaign-wizard/types";

type ModeloSelo = {
  id: string;
  nome: string;
  icon: (isSelected: boolean) => React.ReactNode;
};

const modelos: ModeloSelo[] = [
  {
    id: "classico",
    nome: "Modelo 1 · Clássico",
    icon: () => (
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          bgcolor: "#D8E8DD",
          border: "2px solid #0F4C3A",
        }}
      />
    ),
  },
  {
    id: "escudo",
    nome: "Modelo 3 · Escudo",
    icon: (isSelected) => (
      <ShieldOutlinedIcon sx={{ fontSize: 44, color: isSelected ? "primary.main" : "text.secondary" }} />
    ),
  },
  {
    id: "fita",
    nome: "Modelo 5 · Fita",
    icon: (isSelected) => (
      <BookmarkBorderRoundedIcon sx={{ fontSize: 44, color: isSelected ? "primary.main" : "text.secondary" }} />
    ),
  },
  {
    id: "hexagono",
    nome: "Modelo 2 · Hexágono",
    icon: (isSelected) => (
      <Box sx={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <HexagonOutlinedIcon sx={{ fontSize: 48, color: isSelected ? "primary.main" : "text.secondary" }} />
        <Box
          sx={{
            position: "absolute",
            width: 14,
            height: 14,
            borderRadius: "50%",
            bgcolor: "#D8E8DD",
          }}
        />
      </Box>
    ),
  },
  {
    id: "selo",
    nome: "Modelo 4 · Selo",
    icon: () => (
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "2px dashed #999",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            bgcolor: "#E6E2D8",
          }}
        />
      </Box>
    ),
  },
];

type Props = {
  data: CampaignWizardData;
  onChange: (patch: Partial<CampaignWizardData>) => void;
};

export default function StepModeloSelo({ data, onChange }: Props) {
  const selected = data.modeloSelo ?? "classico";

  return (
    <Grid container spacing={3}>
      {modelos.map((modelo) => {
        const isSelected = selected === modelo.id;
        return (
          <Grid key={modelo.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Box
              onClick={() => onChange({ modeloSelo: modelo.id })}
              sx={{
                border: "1.5px solid",
                borderColor: isSelected ? "primary.main" : "divider",
                bgcolor: isSelected ? "action.hover" : "background.paper",
                borderRadius: 3,
                p: 3,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "space-between",
                minHeight: 155,
                position: "relative",
                transition: "border-color 0.15s ease, background-color 0.15s ease",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
              {isSelected && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckRoundedIcon sx={{ fontSize: 16 }} />
                </Box>
              )}

              <Box sx={{ mb: 2 }}>{modelo.icon(isSelected)}</Box>

              <Typography
                variant="body2"
                sx={{
                  fontWeight: isSelected ? 700 : 600,
                  color: isSelected ? "primary.main" : "text.secondary",
                }}
              >
                {modelo.nome}
              </Typography>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
