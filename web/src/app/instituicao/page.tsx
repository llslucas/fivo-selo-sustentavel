import type { Metadata } from "next";
import StatusCadastroInstituicao from "@/components/instituicao/StatusCadastroInstituicao";

export const metadata: Metadata = {
  title: "Status do cadastro · Fivo",
};

export default function InstituicaoPage() {
  return <StatusCadastroInstituicao status="PENDENTE_APROVACAO" />;
}
