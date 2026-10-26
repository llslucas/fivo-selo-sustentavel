import AppHeader from "@/components/layout/AppHeader";
import AuthGuard from "@/components/layout/AuthGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard papel="EMPRESA">
      <AppHeader />
      <main>{children}</main>
    </AuthGuard>
  );
}
