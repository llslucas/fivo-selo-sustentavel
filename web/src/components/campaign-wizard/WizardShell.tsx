"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Grid from "@mui/material/Grid";

export default function WizardShell({
  step,
  totalSteps,
  title,
  subtitle,
  preview,
  children,
  onBack,
  onNext,
  nextLabel = "Continuar",
  nextDisabled = false,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  preview: React.ReactNode;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <Box className="visually-hidden" role="status" aria-live="polite">
        {`Etapa ${step} de ${totalSteps}: ${title}`}
      </Box>
      <Box>
        <Chip
          label={`Etapa ${step} de ${totalSteps}`}
          size="small"
          sx={{
            bgcolor: "primary.light",
            color: "primary.main",
            fontWeight: 600,
            mb: 1.5,
          }}
        />
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={(step / totalSteps) * 100}
          aria-label={`Progresso: etapa ${step} de ${totalSteps}`}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: "divider",
            "& .MuiLinearProgress-bar": { borderRadius: 2 },
          }}
        />
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 5 }}>{preview}</Grid>
        <Grid size={{ xs: 12, md: 7 }}>{children}</Grid>
      </Grid>

      <Box
        sx={{
          borderTop: 1,
          borderColor: "divider",
          pt: 3,
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          justifyContent: "space-between",
        }}
      >
        {onBack ? (
          <Button variant="outlined" color="inherit" onClick={onBack}>
            Voltar
          </Button>
        ) : (
          <Box aria-hidden="true" />
        )}
        <Button variant="contained" onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
        </Button>
      </Box>
    </Box>
  );
}
