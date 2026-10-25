import AuthGuard from "@/components/layout/AuthGuard";

export default function InstituicaoLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard papel="INSTITUICAO">{children}</AuthGuard>;
}
