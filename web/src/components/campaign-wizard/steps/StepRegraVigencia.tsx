"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import type { CampaignWizardData } from "@/lib/campaign-wizard/types";

type Props = {
  data: CampaignWizardData;
  onChange: (patch: Partial<CampaignWizardData>) => void;
};

// Regra de doação, meta, vigência e capa. Só a regra e a data de início são
// exigidas para enviar à análise; meta, fim e capa são opcionais.
export default function StepRegraVigencia({ data, onChange }: Props) {
  const valorFixo = data.regraTipo === "valor_fixo";

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Regra da doação
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Quanto será doado a cada venda com o selo.
        </Typography>

        <ToggleButtonGroup
          value={data.regraTipo}
          exclusive
          aria-label="Regra da doação"
          onChange={(_, value) => value && onChange({ regraTipo: value })}
          sx={{ mb: 2, flexWrap: "wrap" }}
        >
          <ToggleButton value="valor_fixo">Valor fixo por unidade</ToggleButton>
          <ToggleButton value="percentual">Percentual da venda</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          label={valorFixo ? "Valor doado por unidade" : "Percentual doado"}
          value={data.regraValor}
          onChange={(e) => onChange({ regraValor: e.target.value })}
          type="number"
          fullWidth
          slotProps={{
            htmlInput: { min: 0, step: 0.01 },
            input: {
              startAdornment: valorFixo ? (
                <InputAdornment position="start">R$</InputAdornment>
              ) : undefined,
              endAdornment: valorFixo ? undefined : (
                <InputAdornment position="end">%</InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <TextField
        label="Meta de arrecadação (opcional)"
        value={data.meta}
        onChange={(e) => onChange({ meta: e.target.value })}
        type="number"
        fullWidth
        slotProps={{
          htmlInput: { min: 0, step: 0.01 },
          input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> },
        }}
      />

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Vigência
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Início"
            type="date"
            value={data.vigenciaInicio}
            onChange={(e) => onChange({ vigenciaInicio: e.target.value })}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Fim (opcional)"
            type="date"
            value={data.vigenciaFim}
            onChange={(e) => onChange({ vigenciaFim: e.target.value })}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Imagem de capa (opcional)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          PNG ou JPG de até 5 MB, exibida na página da campanha.
        </Typography>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Button component="label" variant="outlined" startIcon={<ImageRoundedIcon />}>
            {data.capa ? "Trocar imagem" : "Escolher imagem"}
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg"
              aria-label="Imagem de capa"
              onChange={(e) => onChange({ capa: e.target.files?.[0] ?? null })}
            />
          </Button>
          {data.capa && (
            <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
              {data.capa.name}
            </Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
