import type { Metadata } from "next";
import CampaignWizard from "@/components/campaign-wizard/CampaignWizard";

export const metadata: Metadata = {
  title: "Nova campanha · Fivo",
};

export default function NovaCampanhaPage() {
  return <CampaignWizard />;
}
