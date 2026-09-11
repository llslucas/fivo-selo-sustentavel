"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PanoramaFishEyeRoundedIcon from "@mui/icons-material/PanoramaFishEyeRounded";
import HexagonOutlinedIcon from "@mui/icons-material/HexagonOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import BookmarkBorderRoundedIcon from "@mui/icons-material/BookmarkBorderRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import type { CampaignWizardData } from "@/lib/campaign-wizard/types";

type ModeloSelo = {
  id: string;
  nome: string;
  icon: React.ReactNode;
};

const modelos: ModeloSelo[] = [
  {
    id: "classico",
    nome: "Modelo 1 · Clássico",
    icon: <PanoramaFishEyeRoundedIcon sx={{ fontSize: 48, color: "text.secondary" }} />,
  },
  {
    id: "escudo",
    nome: "Modelo 3 · Escudo",
    icon: <ShieldOutlinedIcon sx={{ fontSize: 48, color: "text.secondary" }} />,
  },
  {
    id: "fita",
    nome: "Modelo 5 · Fita",
    icon: <BookmarkBorderRoundedIcon sx={{ fontSize: 48, color: "text.secondary" }} />,
  },
  {
    id: "hexagono",
    nome: "Modelo 2 · Hexágono",
    icon: <HexagonOutlinedIcon sx={{ fontSize: 48, color: "text.secondary" }} />,
  },
  {
    id: "selo",
    nome: "Modelo 4 · Selo",
    icon: (
      <RadioButtonUncheckedRoundedIcon
        sx={{ fontSize: 48, color: "text.secondary", borderRadius: "50%", border: "2px dashed", borderColor: "divider" }}
      />
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
    <Grid container spacing={2}>
      {modelos.map((modelo) => {
        const isSelected = selected === modelo.id;
        return (
          <Grid key={modelo.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Box
              onClick={() => onChange({ modeloSelo: modelo.id })}
              sx={{
                border: 1,
                borderColor: isSelected ? "primary.main" : "divider",
                bgcolor: isSelected ? "primary.light" : "background.default",
                borderRadius: 2,
                p: 3,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 2,
                position: "relative",
                minHeight: 140,
                transition: "border-color 0.15s ease, background-color 0.15s ease",
                "&:hover": { borderColor: "primary.main" },
              }}
            >
              {isSelected && (
                <CheckCircleRoundedIcon
                  color="primary"
                  sx={{ position: "absolute", top: 10, right: 10, fontSize: 20 }}
                />
              )}
              {modelo.icon}
              <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 400 }}>
                {modelo.nome}
              </Typography>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
