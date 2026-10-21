import type { Metadata } from "next";
import CadastroInstituicaoForm from "@/components/cadastro/CadastroInstituicaoForm";

export const metadata: Metadata = {
  title: "Cadastro da instituição · Fivo",
};

export default function CadastroInstituicaoPage() {
  return <CadastroInstituicaoForm />;
}