import AdminHeader from "@/components/layout/AdminHeader";
import AuthGuard from "@/components/layout/AuthGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard papel="ADMIN">
      <AdminHeader />
      <main>{children}</main>
    </AuthGuard>
  );
}
