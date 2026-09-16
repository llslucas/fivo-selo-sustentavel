import type { Metadata } from "next";
import CadastroWizard from "@/components/cadastro/CadastroWizard";

export const metadata: Metadata = {
  title: "Cadastro da empresa · Fivo",
};

export default function CadastroPage() {
  return <CadastroWizard />;
}