"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import WizardShellForm from "./WizardShellForm";
import StepSobreCampanha from "./steps/StepSobreCampanha";
import StepRegraVigencia from "./steps/StepRegraVigencia";
import { montarNovaCampanha } from "@/lib/campaign-wizard/payload";
import { initialWizardData, type CampaignWizardData } from "@/lib/campaign-wizard/types";
import { textoDoValor } from "@/lib/campanhas/formatacao";
import { APP_ROUTES } from "@/lib/routes";
import { mensagemDeErro } from "@/services/api";
import { criarCampanha, enviarCapa, submeterCampanha } from "@/services/campanhas";

const TOTAL_STEPS = 3;

const MENSAGEM_ENVIADA = "Campanha enviada para análise.";

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function rotaDaCampanha(id: string): string {
  return `${APP_ROUTES.private.campanhas}/${id}`;
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function CampaignWizardNew() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<CampaignWizardData>(initialWizardData);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Guardado depois do POST: se a capa ou a submissão falharem, a nova
  // tentativa não cria a campanha de novo.
  const [campanhaId, setCampanhaId] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);

  function patch(p: Partial<CampaignWizardData>) {
    setData((prev) => ({ ...prev, ...p }));
  }

  const stepValidations: Record<number, boolean> = {
    1: data.nome.trim().length > 0 && data.descricao.trim().length > 0 && data.instituicaoId !== null,
    2: data.regraValor.trim().length > 0 && data.vigenciaInicio.length > 0,
    3: true,
  };

  async function salvar(): Promise<string> {
    let id = campanhaId;

    if (!id) {
      id = (await criarCampanha(montarNovaCampanha(data))).id;
      setCampanhaId(id);
    }

    if (data.capa) await enviarCapa(id, data.capa);

    return id;
  }

  async function executar(acao: () => Promise<void>) {
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await acao();
    } catch (e) {
      // Os campos ficam como estão, para a empresa corrigir e tentar de novo.
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  function salvarRascunho() {
    void executar(async () => {
      const id = await salvar();
      router.push(rotaDaCampanha(id));
    });
  }

  function enviarParaAnalise() {
    void executar(async () => {
      const id = await salvar();
      await submeterCampanha(id);
      setEnviada(true);
    });
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setErro(null);
      setStep((s) => s + 1);
    } else {
      enviarParaAnalise();
    }
  }

  function handleBack() {
    setErro(null);
    setStep((s) => Math.max(1, s - 1));
  }

  if (enviada && campanhaId) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
        <Stack spacing={3}>
          <Alert severity="success">{MENSAGEM_ENVIADA}</Alert>
          <Typography variant="body1" color="text.secondary">
            A equipe da Fivo Lab vai analisar <strong>{data.nome}</strong>. Quando ela for
            aprovada, o selo fica disponível para download na sua área.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button component={Link} href={rotaDaCampanha(campanhaId)} variant="contained">
              Ver campanha
            </Button>
            <Button component={Link} href={APP_ROUTES.private.campanhas} variant="outlined">
              Minhas campanhas
            </Button>
          </Stack>
        </Stack>
      </Container>
    );
  }

  const acaoSecundaria = (
    <Button
      variant="outlined"
      onClick={salvarRascunho}
      disabled={enviando || data.nome.trim().length === 0}
    >
      Salvar rascunho
    </Button>
  );

  const aviso = erro ? (
    <Alert severity="error" role="alert">
      {erro}
    </Alert>
  ) : null;

  return (
    <>
      {step === 1 && (
        <WizardShellForm
          step={1}
          totalSteps={TOTAL_STEPS}
          title="Sobre a campanha"
          subtitle="Essas informações vão aparecer na página pública que o consumidor acessa pelo QR Code."
          onNext={handleNext}
          nextDisabled={!stepValidations[1] || enviando}
          acaoSecundaria={acaoSecundaria}
          aviso={aviso}
        >
          <StepSobreCampanha data={data} onChange={patch} />
        </WizardShellForm>
      )}

      {step === 2 && (
        <WizardShellForm
          step={2}
          totalSteps={TOTAL_STEPS}
          title="Regra de doação e vigência"
          subtitle="Quanto será doado, a meta e o período da campanha."
          onBack={handleBack}
          onNext={handleNext}
          nextDisabled={!stepValidations[2] || enviando}
          acaoSecundaria={acaoSecundaria}
          aviso={aviso}
        >
          <StepRegraVigencia data={data} onChange={patch} />
        </WizardShellForm>
      )}

      {step === 3 && (
        <WizardShellForm
          step={3}
          totalSteps={TOTAL_STEPS}
          title="Revise e envie"
          subtitle="Depois de enviada, a campanha passa pela análise da Fivo Lab antes de ser publicada."
          onBack={handleBack}
          onNext={handleNext}
          nextLabel="Enviar para análise"
          nextDisabled={enviando}
          acaoSecundaria={acaoSecundaria}
          aviso={aviso}
        >
          <Box
            component="dl"
            sx={{
              m: 0,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "200px 1fr" },
              rowGap: 1.5,
              columnGap: 2,
              "& dt": { fontWeight: 700 },
              "& dd": { m: 0, overflowWrap: "anywhere" },
            }}
          >
            <dt>Nome</dt>
            <dd>{data.nome}</dd>
            <dt>Descrição</dt>
            <dd>{data.descricao}</dd>
            <dt>Beneficiada</dt>
            <dd>{data.beneficiadaNome ?? "—"}</dd>
            <dt>Regra de doação</dt>
            <dd>{textoDoValor(montarNovaCampanha(data).regraDoacao ?? null)}</dd>
            <dt>Meta</dt>
            <dd>{data.meta ? REAIS.format(Number(data.meta)) : "Sem meta"}</dd>
            <dt>Vigência</dt>
            <dd>
              {data.vigenciaInicio &&
                (data.vigenciaFim
                  ? `${formatarData(data.vigenciaInicio)} a ${formatarData(data.vigenciaFim)}`
                  : `A partir de ${formatarData(data.vigenciaInicio)}`)}
            </dd>
            <dt>Capa</dt>
            <dd>{data.capa?.name ?? "Sem imagem"}</dd>
          </Box>
        </WizardShellForm>
      )}
    </>
  );
}
