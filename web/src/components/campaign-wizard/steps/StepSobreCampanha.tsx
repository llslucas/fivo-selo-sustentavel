"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import { instituicoesMock } from "@/lib/campaign-wizard/mock-data";
import type { CampaignWizardData } from "@/lib/campaign-wizard/types";

type Props = {
  data: CampaignWizardData;
  onChange: (patch: Partial<CampaignWizardData>) => void;
};

export default function StepSobreCampanha({ data, onChange }: Props) {
  return (
    <Stack spacing={4}>
      {/* Nome da campanha */}
      <TextField
        label="Nome da campanha"
        placeholder="Café que alimenta"
        value={data.nome}
        onChange={(e) => onChange({ nome: e.target.value })}
        fullWidth
      />

      {/* Descrição */}
      <TextField
        label="Descrição"
        placeholder="A cada pacote de café vendido, parte da renda é destinada à Casa do Bem, apoiando o programa de merenda para crianças da região."
        value={data.descricao}
        onChange={(e) => onChange({ descricao: e.target.value })}
        fullWidth
        multiline
        minRows={4}
      />

      {/* Causa ou instituição beneficiada */}
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
          Causa ou instituição beneficiada
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          {instituicoesMock.map((inst) => {
            const selected = data.instituicaoId === inst.id;
            return (
              <Box
                key={inst.id}
                onClick={() => onChange({ instituicaoId: inst.id })}
                sx={{
                  flex: 1,
                  border: 1,
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "primary.light" : "background.default",
                  borderRadius: 2,
                  p: 2,
                  cursor: "pointer",
                  position: "relative",
                  transition: "border-color 0.15s ease, background-color 0.15s ease",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                {/* Avatar colorido da instituição */}
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    bgcolor: selected ? "primary.main" : "divider",
                    mb: 1.5,
                    opacity: 0.6,
                  }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {inst.nome}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {inst.descricao}
                </Typography>
                {selected && (
                  <CheckCircleRoundedIcon
                    color="primary"
                    sx={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      fontSize: 20,
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>

      {/* Regra de doação inline */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 2,
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          R$
        </Typography>
        <TextField
          value={data.regraValor}
          onChange={(e) => onChange({ regraValor: e.target.value })}
          type="number"
          size="small"
          sx={{ width: 80 }}
          slotProps={{ input: { inputProps: { min: 0, step: 0.5 } } }}
        />
        <Typography variant="body2" color="text.secondary">
          será doado{" "}
          <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
            por unidade vendida
          </Typography>{" "}
          com o selo aplicado
        </Typography>
      </Box>
    </Stack>
  );
}
