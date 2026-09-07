"use client";

import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { CampaignWizardData } from "@/lib/campaign-wizard/types";

export default function StepInfo({
  data,
  onChange,
}: {
  data: CampaignWizardData;
  onChange: (patch: Partial<CampaignWizardData>) => void;
}) {
  return (
    <Stack spacing={3}>
      <TextField
        label="Nome da campanha"
        placeholder="Ex: Café que alimenta"
        helperText="Esse nome aparece na página pública e no selo."
        value={data.nome}
        onChange={(e) => onChange({ nome: e.target.value })}
        fullWidth
      />
      <TextField
        label="Descrição"
        placeholder="Conte brevemente o que é essa iniciativa."
        helperText="Vai aparecer na página pública da campanha."
        value={data.descricao}
        onChange={(e) => onChange({ descricao: e.target.value })}
        fullWidth
        multiline
        minRows={4}
      />
    </Stack>
  );
}
