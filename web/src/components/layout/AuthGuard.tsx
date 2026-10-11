"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useAuth } from "@/hooks/useAuth";
import { APP_ROUTES } from "@/lib/routes";

// Protege as telas do dashboard: lê o estado de sessão do AuthContext (que já
// consultou GET /empresas/me uma vez, na raiz da aplicação) e manda pro login
// se não houver sessão válida — sem repetir a chamada aqui.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { estado } = useAuth();

  useEffect(() => {
    if (estado === "nao-autenticado" || estado === "expirada") {
      router.replace(APP_ROUTES.public.login);
    }
  }, [estado, router]);

  if (estado === "carregando") {
    return (
      <Box
        sx={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Enquanto o redirect do efeito acima acontece, não renderiza conteúdo privado.
  if (estado !== "autenticado") {
    return null;
  }

  return <>{children}</>;
}
