"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import type { CampaignWizardData } from "@/lib/campaign-wizard/types";
import { useBeneficiadas } from "../hooks/useBeneficiadas";
import SeletorBeneficiada from "../SeletorBeneficiada";

type Props = {
  data: CampaignWizardData;
  onChange: (patch: Partial<CampaignWizardData>) => void;
};

export default function StepSobreCampanha({ data, onChange }: Props) {
  // Catálogo real de beneficiadas obtido do endpoint `GET /beneficiadas`. A
  // seleção vive no estado do wizard (`data.instituicaoId`), nunca em estado
  // local do passo (Requisitos 5.1, 5.4, 7.1, 7.5).
  const {
    estado,
    beneficiadas,
    termoBusca,
    mensagemErro,
    podeTentarNovamente,
    definirTermoBusca,
    tentarNovamente,
  } = useBeneficiadas();

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
        <SeletorBeneficiada
          variante="cards"
          beneficiadas={beneficiadas}
          estado={estado}
          termoBusca={termoBusca}
          mensagemErro={mensagemErro}
          podeTentarNovamente={podeTentarNovamente}
          selecionadaId={data.instituicaoId}
          onBuscar={definirTermoBusca}
          onTentarNovamente={tentarNovamente}
          onSelecionar={(id) => {
            const escolhida = beneficiadas.find((b) => b.id === id);
            onChange({
              instituicaoId: id,
              beneficiadaTipo: escolhida?.tipo ?? null,
              beneficiadaNome: escolhida?.nome ?? null,
            });
          }}
        />
      </Box>
    </Stack>
  );
}
