"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import type { CampaignWizardData } from "@/lib/campaign-wizard/types";
import SeletorBeneficiada from "../SeletorBeneficiada";
import { useBeneficiadas } from "../hooks/useBeneficiadas";

// Mensagem exibida quando a empresa aciona a afordância de pré-cadastro
// enquanto o endpoint correspondente não existe (Requisitos 8.2, 8.3).
const MENSAGEM_PRE_CADASTRO_INDISPONIVEL =
  "O pré-cadastro de instituições ainda não está disponível. Em breve você poderá solicitar a inclusão de uma nova beneficiada por aqui.";

export default function StepCausaRegra({
  data,
  onChange,
}: {
  data: CampaignWizardData;
  onChange: (patch: Partial<CampaignWizardData>) => void;
}) {
  // Catálogo real servido por GET /beneficiadas. A seleção é persistida
  // exclusivamente no estado do wizard (data.instituicaoId), nunca em estado
  // local do passo (Requisitos 5.1, 5.4, 7.1).
  const {
    estado,
    beneficiadas,
    termoBusca,
    mensagemErro,
    podeTentarNovamente,
    definirTermoBusca,
    tentarNovamente,
  } = useBeneficiadas();

  // Afordância de pré-cadastro em estado "em breve": nenhum dado fabricado,
  // nenhuma requisição de rede. Os campos digitados permanecem preservados
  // (Requisitos 8.1, 8.2, 8.3, 8.6).
  const [formAberto, setFormAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoCnpj, setNovoCnpj] = useState("");
  const [preCadastroIndisponivel, setPreCadastroIndisponivel] = useState(false);

  // Aciona a afordância de pré-cadastro: apenas sinaliza a indisponibilidade.
  // Não fabrica beneficiadas locais, não altera a seleção nem os dados
  // preenchidos e não emite nenhuma requisição (Requisitos 8.1, 8.2, 8.3, 8.6).
  function handleSolicitarPreCadastro() {
    setPreCadastroIndisponivel(true);
  }

  return (
    <Stack spacing={4}>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Instituição beneficiada
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Escolha quem recebe a doação desta campanha.
        </Typography>

        <SeletorBeneficiada
          variante="lista"
          beneficiadas={beneficiadas}
          estado={estado}
          termoBusca={termoBusca}
          mensagemErro={mensagemErro}
          podeTentarNovamente={podeTentarNovamente}
          selecionadaId={data.instituicaoId}
          onBuscar={definirTermoBusca}
          onTentarNovamente={tentarNovamente}
          onSelecionar={(id) => onChange({ instituicaoId: id })}
        />

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
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSolicitarPreCadastro}
                >
                  Solicitar pré-cadastro
                </Button>
                <Button variant="text" size="small" onClick={() => setFormAberto(false)}>
                  Cancelar
                </Button>
              </Stack>
              {preCadastroIndisponivel && (
                <Typography
                  role="status"
                  data-testid="pre-cadastro-indisponivel"
                  variant="caption"
                  color="text.secondary"
                >
                  {MENSAGEM_PRE_CADASTRO_INDISPONIVEL}
                </Typography>
              )}
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
          aria-label="Regra da doação"
          onChange={(_, value) => value && onChange({ regraTipo: value })}
          sx={{ mb: 2, flexWrap: "wrap" }}
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
