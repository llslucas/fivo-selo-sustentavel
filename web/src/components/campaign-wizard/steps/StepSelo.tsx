"use client";

import { useId, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import type { CampaignWizardData } from "@/lib/campaign-wizard/types";

export default function StepSelo({
  data,
  onChange,
}: {
  data: CampaignWizardData;
  onChange: (patch: Partial<CampaignWizardData>) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange({ logoFile: file, logoPreviewUrl: url });
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          Logo da empresa
        </Typography>
        <Box
          component="label"
          aria-label="Enviar logo da empresa"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          sx={{
            display: "block",
            border: "1px dashed",
            borderColor: dragOver ? "primary.main" : "divider",
            bgcolor: dragOver ? "primary.light" : "background.paper",
            borderRadius: 2,
            py: 5,
            px: 3,
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color 0.15s ease, background-color 0.15s ease",
            "&:hover": { borderColor: "primary.main" },
            "&:focus-within": {
              borderColor: "primary.main",
              outline: "2px solid var(--color-primary)",
              outlineOffset: 2,
            },
          }}
        >
          <input
            type="file"
            accept="image/png,image/svg+xml"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <FileUploadRoundedIcon sx={{ color: "text.secondary", mb: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {data.logoFile ? data.logoFile.name : "Arraste o arquivo ou clique para enviar"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PNG ou SVG, fundo transparente
          </Typography>
        </Box>
      </Box>

      <ToggleRow
        title="Mostrar valor doado no selo"
        description='Exibe "R$ 1,00 por unidade" no arquivo final'
        checked={data.mostrarValorNoSelo}
        onChange={(checked) => onChange({ mostrarValorNoSelo: checked })}
      />

      <ToggleRow
        title={`Vincular à campanha "${data.nome || "sem nome"}"`}
        description="O QR Code aponta para a página pública desta campanha"
        checked={data.vincularCampanha}
        onChange={(checked) => onChange({ vincularCampanha: checked })}
      />
    </Stack>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const titleId = useId();
  const descId = useId();
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: "background.paper",
      }}
    >
      <Box>
        <Typography id={titleId} variant="subtitle2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography id={descId} variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <Switch
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        slotProps={{
          input: { "aria-labelledby": titleId, "aria-describedby": descId },
        }}
      />
    </Stack>
  );
}
