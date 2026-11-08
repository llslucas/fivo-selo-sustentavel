import type { Metadata } from "next";
import DetalheCampanha from "@/components/campanhas/DetalheCampanha";

export const metadata: Metadata = {
  title: "Campanha · Fivo",
};

export default async function DetalheCampanhaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetalheCampanha id={id} />;
}
