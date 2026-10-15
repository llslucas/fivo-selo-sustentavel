"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AsyncState from "@/components/ui/AsyncState";
import { useAuth } from "@/hooks/useAuth";
import { APP_ROUTES } from "@/lib/routes";

// Protege as telas do dashboard: lê o estado de sessão do AuthContext (que já
// consultou GET /empresas/me uma vez, na raiz da aplicação) e manda pro login
// se não houver sessão válida — sem repetir a chamada aqui. Outras falhas
// (rede, servidor, permissão) aparecem na tela com opção de tentar de novo.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { estado, erro, tentarNovamente } = useAuth();

  useEffect(() => {
    if (estado === "nao-autenticado" || estado === "expirada") {
      router.replace(APP_ROUTES.public.login);
    }
  }, [estado, router]);

  // Enquanto o redirect do efeito acima acontece, não renderiza conteúdo privado.
  if (estado === "nao-autenticado" || estado === "expirada") {
    return null;
  }

  return (
    <AsyncState
      loading={estado === "carregando"}
      erro={estado === "erro" ? erro : null}
      onRetry={tentarNovamente}
    >
      {children}
    </AsyncState>
  );
}
