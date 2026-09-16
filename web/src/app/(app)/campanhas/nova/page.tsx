import type { Metadata } from "next";
import CampaignWizardNew from "@/components/campaign-wizard/CampaignWizardNew";

export const metadata: Metadata = {
  title: "Nova campanha · Fivo",
};

export default function NovaCampanhaPage() {
  return <CampaignWizardNew />;
}
