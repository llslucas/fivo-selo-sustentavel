"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Container from "@mui/material/Container";

interface WizardShellFormProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  // Botão extra ao lado do de avançar (ex.: "Salvar rascunho").
  acaoSecundaria?: React.ReactNode;
  // Mensagem logo acima dos botões (ex.: erro da API).
  aviso?: React.ReactNode;
}

export default function WizardShellForm({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onBack,
  onNext,
  nextLabel = "Continuar",
  nextDisabled = false,
  acaoSecundaria,
  aviso,
}: WizardShellFormProps) {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
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

        <Box>{children}</Box>

        {aviso}

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            justifyContent: "space-between",
            pt: 2,
          }}
        >
          {onBack ? (
            <Button variant="outlined" color="inherit" onClick={onBack}>
              Voltar
            </Button>
          ) : (
            <Box aria-hidden="true" />
          )}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {acaoSecundaria}
            <Button variant="contained" onClick={onNext} disabled={nextDisabled}>
              {nextLabel}
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
