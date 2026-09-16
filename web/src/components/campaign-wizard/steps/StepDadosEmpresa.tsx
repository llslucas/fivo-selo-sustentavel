"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import type { CampaignWizardData } from "@/lib/campaign-wizard/types";

type Props = {
  data: CampaignWizardData;
  onChange: (patch: Partial<CampaignWizardData>) => void;
};

export default function StepDadosEmpresa({ data, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange({ logoFile: file, logoPreviewUrl: url });
  }

  return (
    <Stack spacing={3}>
      {/* Razão social + CNPJ */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 7 }}>
          <TextField
            label="Razão social"
            placeholder="Café Serra Verde Ltda"
            value={data.razaoSocial ?? ""}
            onChange={(e) => onChange({ razaoSocial: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 5 }}>
          <TextField
            label="CNPJ"
            placeholder="12.345.678/0001-90"
            value={data.cnpj ?? ""}
            onChange={(e) => onChange({ cnpj: e.target.value })}
            fullWidth
            slotProps={{
              input: {
                endAdornment: data.cnpj ? (
                  <InputAdornment position="end">
                    <CheckRoundedIcon sx={{ color: "primary.main", fontSize: 20 }} />
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
        </Grid>
      </Grid>

      {/* E-mail + Telefone */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="E-mail"
            placeholder="contato@serraverde.com.br"
            type="email"
            value={data.emailEmpresa ?? ""}
            onChange={(e) => onChange({ emailEmpresa: e.target.value })}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Telefone"
            placeholder="(19) 99999-0000"
            type="tel"
            value={data.telefoneEmpresa ?? ""}
            onChange={(e) => onChange({ telefoneEmpresa: e.target.value })}
            fullWidth
          />
        </Grid>
      </Grid>

      {/* Upload de logo */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          Logo da empresa
        </Typography>
        <Box
          onClick={() => inputRef.current?.click()}
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
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/svg+xml"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {data.logoPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.logoPreviewUrl}
              alt="Logo preview"
              style={{ maxHeight: 80, maxWidth: "100%", objectFit: "contain" }}
            />
          ) : (
            <>
              <ImageRoundedIcon sx={{ color: "text.secondary", mb: 1, fontSize: 36 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Arraste o arquivo ou clique para enviar
              </Typography>
              <Typography variant="caption" color="text.secondary">
                PNG ou SVG, fundo transparente
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Stack>
  );
}
