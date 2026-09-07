"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { instituicoesMock } from "@/lib/campaign-wizard/mock-data";
import type { CampaignWizardData, Instituicao } from "@/lib/campaign-wizard/types";

export default function StepCausaRegra({
  data,
  onChange,
}: {
  data: CampaignWizardData;
  onChange: (patch: Partial<CampaignWizardData>) => void;
}) {
  const [extraInstituicoes, setExtraInstituicoes] = useState<Instituicao[]>([]);
  const [formAberto, setFormAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoCnpj, setNovoCnpj] = useState("");

  const instituicoes = [...instituicoesMock, ...extraInstituicoes];

  function handleAdicionarInstituicao() {
    if (!novoNome.trim()) return;
    const nova: Instituicao = {
      id: `custom-${Date.now()}`,
      nome: novoNome.trim(),
      cidade: "—",
      descricao: "Pré-cadastro enviado pela sua empresa.",
    };
    setExtraInstituicoes((prev) => [...prev, nova]);
    onChange({ instituicaoId: nova.id });
    setNovoNome("");
    setNovoCnpj("");
    setFormAberto(false);
  }

  const instituicaoSelecionadaEhNova = extraInstituicoes.some(
    (i) => i.id === data.instituicaoId,
  );

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Instituição beneficiada
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Escolha quem recebe a doação desta campanha.
        </Typography>

        <Stack spacing={1.5}>
          {instituicoes.map((instituicao) => {
            const selected = data.instituicaoId === instituicao.id;
            return (
              <Box
                key={instituicao.id}
                onClick={() => onChange({ instituicaoId: instituicao.id })}
                sx={{
                  border: 1,
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "primary.light" : "transparent",
                  borderRadius: 2,
                  p: 2,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  transition: "border-color 0.15s ease, background-color 0.15s ease",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {instituicao.nome}
                    </Typography>
                    {extraInstituicoes.some((i) => i.id === instituicao.id) && (
                      <Chip
                        label="Pendente de aprovação"
                        size="small"
                        sx={{ bgcolor: "secondary.light", color: "secondary.dark", fontWeight: 600 }}
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {instituicao.cidade}
                  </Typography>
                </Box>
                {selected && (
                  <CheckCircleRoundedIcon color="primary" fontSize="small" />
                )}
              </Box>
            );
          })}
        </Stack>

        {formAberto ? (
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Pré-cadastrar nova instituição
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Nome da instituição"
                size="small"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                fullWidth
              />
              <TextField
                label="CNPJ"
                size="small"
                value={novoCnpj}
                onChange={(e) => setNovoCnpj(e.target.value)}
                fullWidth
              />
              <Stack direction="row" spacing={1.5}>
                <Button variant="contained" size="small" onClick={handleAdicionarInstituicao}>
                  Adicionar
                </Button>
                <Button variant="text" size="small" onClick={() => setFormAberto(false)}>
                  Cancelar
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                A instituição fica pendente até a Fivo Lab aprovar o cadastro.
              </Typography>
            </Stack>
          </Box>
        ) : (
          <Button
            startIcon={<AddRoundedIcon />}
            onClick={() => setFormAberto(true)}
            sx={{ mt: 1.5 }}
          >
            Não encontrou? Cadastrar uma nova instituição
          </Button>
        )}
        {instituicaoSelecionadaEhNova && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Você pode continuar o cadastro da campanha — a aprovação acontece em paralelo.
          </Typography>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Regra da doação
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Quanto será doado a cada unidade vendida com o selo.
        </Typography>

        <ToggleButtonGroup
          value={data.regraTipo}
          exclusive
          onChange={(_, value) => value && onChange({ regraTipo: value })}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="valor_fixo">Valor fixo por unidade</ToggleButton>
          <ToggleButton value="percentual">Percentual da venda</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          label={data.regraTipo === "valor_fixo" ? "Valor doado por unidade" : "Percentual doado"}
          value={data.regraValor}
          onChange={(e) => onChange({ regraValor: e.target.value })}
          type="number"
          fullWidth
          slotProps={{
            input: {
              startAdornment:
                data.regraTipo === "valor_fixo" ? (
                  <InputAdornment position="start">R$</InputAdornment>
                ) : undefined,
              endAdornment:
                data.regraTipo === "percentual" ? (
                  <InputAdornment position="end">%</InputAdornment>
                ) : undefined,
            },
          }}
        />
      </Box>
    </Stack>
  );
}
