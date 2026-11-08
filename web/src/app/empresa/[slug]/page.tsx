"use client";

import { use } from "react";
import PaginaEmpresaPublica from "@/components/empresa/PaginaEmpresaPublica";

export default function EmpresaPublicaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <PaginaEmpresaPublica slug={slug} />;
}

