"use client";

import { use } from "react";
import PaginaEmpresaPublica from "@/components/empresa/PaginaEmpresaPublica";

export default function EmpresaCampanhaPage({
  params,
}: {
  params: Promise<{ slug: string; slugCampanha: string }>;
}) {
  const { slug, slugCampanha } = use(params);
  return <PaginaEmpresaPublica slug={slug} slugCampanha={slugCampanha} />;
}
