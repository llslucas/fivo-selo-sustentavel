"use client";

import { useEffect, useState } from "react";
import WizardShellForm from "./WizardShellForm";
import SuccessScreen from "./SuccessScreen";
import StepSobreCampanha from "./steps/StepSobreCampanha";
import StepModeloSelo from "./steps/StepModeloSelo";
import StepDadosEmpresa from "./steps/StepDadosEmpresa";
import { initialWizardData, type CampaignWizardData } from "@/lib/campaign-wizard/types";
import Container from "@mui/material/Container";

const TOTAL_STEPS = 3;

export default function CampaignWizardNew() {
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

  const stepValidations: Record<number, boolean> = {
    1: data.nome.trim().length > 0 && data.descricao.trim().length > 0 && data.instituicaoId !== null,
    2: (data.modeloSelo?.length ?? 0) > 0,
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

  if (concluded) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
        <SuccessScreen data={data} />
      </Container>
    );
  }

  return (
    <>
      {step === 1 && (
        <WizardShellForm
          step={1}
          totalSteps={TOTAL_STEPS}
          title="Sobre a campanha"
          subtitle="Essas informações vão aparecer na página pública que o consumidor acessa pelo QR Code."
          onNext={handleNext}
          nextDisabled={!stepValidations[1]}
        >
          <StepSobreCampanha data={data} onChange={patch} />
        </WizardShellForm>
      )}

      {step === 2 && (
        <WizardShellForm
          step={2}
          totalSteps={TOTAL_STEPS}
          title="Escolha um modelo de selo"
          subtitle="Você poderá inserir sua logo e revisar tudo no próximo passo."
          onBack={handleBack}
          onNext={handleNext}
          nextDisabled={!stepValidations[2]}
        >
          <StepModeloSelo data={data} onChange={patch} />
        </WizardShellForm>
      )}

      {step === 3 && (
        <WizardShellForm
          step={3}
          totalSteps={TOTAL_STEPS}
          title="Dados da empresa"
          subtitle="Essas informações aparecem na página pública das suas campanhas."
          onBack={handleBack}
          onNext={handleNext}
          nextLabel="Continuar"
        >
          <StepDadosEmpresa data={data} onChange={patch} />
        </WizardShellForm>
      )}
    </>
  );
}
