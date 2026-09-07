import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

type Campaign = {
  id: string;
  nome: string;
  status: "Ativa" | "Pausada" | "Encerrada";
  apoio: string;
  valorDoado: string;
  qrInfo: string;
};

const statusColors: Record<Campaign["status"], { bg: string; color: string }> = {
  Ativa: { bg: "#E1F5EE", color: "#0F6E56" },
  Pausada: { bg: "#FAEEDA", color: "#854F0B" },
  Encerrada: { bg: "#F3F3F1", color: "#5F5E5A" },
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const colors = statusColors[campaign.status];

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.default",
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
      }}
    >
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {campaign.nome}
        </Typography>
        <Chip
          label={campaign.status}
          size="small"
          sx={{
            bgcolor: colors.bg,
            color: colors.color,
            fontWeight: 600,
            fontSize: "0.75rem",
            height: 22,
          }}
        />
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {campaign.apoio}
      </Typography>

      <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", mt: 0.5 }}>
        {campaign.valorDoado} doados
      </Typography>

      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 0.25 }}>
        <Typography variant="caption" color="text.secondary">
          {campaign.qrInfo}
        </Typography>
        <Link href={`/campanhas/${campaign.id}`} style={{ textDecoration: "none" }}>
          <Stack direction="row" spacing={0.25} sx={{ alignItems: "center", color: "text.secondary" }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Ver
            </Typography>
            <ArrowForwardRoundedIcon sx={{ fontSize: 13 }} />
          </Stack>
        </Link>
      </Stack>
    </Box>
  );
}

export function NewCampaignCard() {
  return (
    <Box
      component={Link}
      href="/campanhas/nova"
      sx={{
        flex: 1,
        minWidth: 0,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        gap: 0.5,
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": { borderColor: "primary.main", bgcolor: "primary.light" },
        cursor: "pointer",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", textAlign: "center" }}>
        Criar nova campanha
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
        Leva cerca de 5 minutos
      </Typography>
    </Box>
  );
}
