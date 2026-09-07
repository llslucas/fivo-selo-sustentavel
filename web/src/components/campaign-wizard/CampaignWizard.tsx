"use client";

import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import WizardShell from "./WizardShell";
import SealPreviewPanel from "./SealPreviewPanel";
import SuccessScreen from "./SuccessScreen";
import StepInfo from "./steps/StepInfo";
import StepCausaRegra from "./steps/StepCausaRegra";
import StepSelo from "./steps/StepSelo";
import { initialWizardData, mockEmpresaAtual, type CampaignWizardData } from "@/lib/campaign-wizard/types";

const TOTAL_STEPS = 3;

export default function CampaignWizard() {
  const [step, setStep] = useState(1);
  const [concluded, setConcluded] = useState(false);
  const [data, setData] = useState<CampaignWizardData>(initialWizardData);

  useEffect(() => {
    return () => {
      if (data.logoPreviewUrl) URL.revokeObjectURL(data.logoPreviewUrl);
    };
  }, [data.logoPreviewUrl]);

  function patch(p: Partial<CampaignWizardData>) {
    setData((prev) => ({ ...prev, ...p }));
  }

  const preview = (
    <SealPreviewPanel
      campaignName={data.nome}
      initials={mockEmpresaAtual.iniciais}
      avatarColor={mockEmpresaAtual.avatarColor}
      logoPreviewUrl={data.logoPreviewUrl}
    />
  );

  const stepValidations: Record<number, boolean> = {
    1: data.nome.trim().length > 0 && data.descricao.trim().length > 0,
    2: data.instituicaoId !== null && data.regraValor.trim().length > 0,
    3: true,
  };

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      setConcluded(true);
    }
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      {concluded ? (
        <SuccessScreen data={data} />
      ) : (
        <Box>
          {step === 1 && (
            <WizardShell
              step={1}
              totalSteps={TOTAL_STEPS}
              title="Conte sobre sua campanha"
              subtitle="Nome e descrição vão aparecer na página pública."
              preview={preview}
              onNext={handleNext}
              nextDisabled={!stepValidations[1]}
            >
              <StepInfo data={data} onChange={patch} />
            </WizardShell>
          )}

          {step === 2 && (
            <WizardShell
              step={2}
              totalSteps={TOTAL_STEPS}
              title="Causa e regra de doação"
              subtitle="Escolha quem é beneficiado e quanto será doado."
              preview={preview}
              onBack={handleBack}
              onNext={handleNext}
              nextDisabled={!stepValidations[2]}
            >
              <StepCausaRegra data={data} onChange={patch} />
            </WizardShell>
          )}

          {step === 3 && (
            <WizardShell
              step={3}
              totalSteps={TOTAL_STEPS}
              title="Personalize seu selo"
              subtitle="Insira sua logo. O QR Code é gerado automaticamente ao final."
              preview={preview}
              onBack={handleBack}
              onNext={handleNext}
              nextLabel="Continuar"
            >
              <StepSelo data={data} onChange={patch} />
            </WizardShell>
          )}
        </Box>
      )}
    </Container>
  );
}
