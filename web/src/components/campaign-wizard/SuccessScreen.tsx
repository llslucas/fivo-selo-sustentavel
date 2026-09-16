"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import Link from "next/link";
import SealPreviewPanel from "./SealPreviewPanel";
import { mockEmpresaAtual, type CampaignWizardData } from "@/lib/campaign-wizard/types";

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function SuccessScreen({ data }: { data: CampaignWizardData }) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const slug = slugify(mockEmpresaAtual.nome) || "sua-campanha";
  const url = `fivo.com.br/c/${slug}`;

  function handleCopy() {
    navigator.clipboard?.writeText(`https://${url}`).catch(() => {});
    setSnackbarOpen(true);
  }

  function handleDownloadStub() {
    setSnackbarOpen(true);
  }

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", textAlign: "center", py: { xs: 4, md: 8 } }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          bgcolor: "primary.light",
          color: "primary.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mx: "auto",
          mb: 2,
        }}
      >
        <CheckRoundedIcon fontSize="medium" />
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        Selo gerado com sucesso!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Ele já está pronto para ser usado na embalagem do seu produto.
      </Typography>

      <Box sx={{ maxWidth: 300, mx: "auto", mb: 3 }}>
        <SealPreviewPanel
          size="large"
          campaignName={data.nome}
          initials={mockEmpresaAtual.iniciais}
          avatarColor={mockEmpresaAtual.avatarColor}
          logoPreviewUrl={data.logoPreviewUrl}
        />
      </Box>

      <Stack
        direction="row"
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          p: 1.5,
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "background.paper",
          mb: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ pl: 1 }}>
          {url}
        </Typography>
        <Button size="small" onClick={handleCopy}>
          Copiar
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button variant="contained" fullWidth onClick={handleDownloadStub}>
          Baixar PNG
        </Button>
        <Button variant="outlined" color="inherit" fullWidth onClick={handleDownloadStub}>
          Baixar SVG
        </Button>
      </Stack>

      <Stack
        component={Link}
        href="#"
        direction="row"
        spacing={0.5}
        sx={{
          justifyContent: "center",
          alignItems: "center",
          color: "primary.main",
          textDecoration: "none",
          "&:hover": { textDecoration: "underline" },
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Ver página pública da campanha
        </Typography>
        <ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />
      </Stack>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2500}
        onClose={() => setSnackbarOpen(false)}
        message="Isso ainda é só um mock — sem geração/backend real por enquanto."
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
