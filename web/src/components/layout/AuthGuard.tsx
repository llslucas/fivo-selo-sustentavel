"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AsyncState from "@/components/ui/AsyncState";
import { useAuth } from "@/hooks/useAuth";
import { APP_ROUTES, rotaInicialDoPapel } from "@/lib/routes";
import type { Papel } from "@/services/auth";

// Protege a área de um papel: lê o estado de sessão do AuthContext (que já
// verificou a sessão uma vez, na raiz da aplicação) e manda pro login se não
// houver sessão válida — sem repetir a chamada aqui. Quem está logado com
// outro papel vai para a própria área, sem ver o conteúdo desta. Outras falhas
// (rede, servidor, permissão) aparecem na tela com opção de tentar de novo.
export default function AuthGuard({
  papel,
  children,
}: {
  papel: Papel;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { estado, erro, tentarNovamente, papel: papelAtual } = useAuth();

  const semSessao = estado === "nao-autenticado" || estado === "expirada";
  const outroPapel = estado === "autenticado" && papelAtual !== papel;

  useEffect(() => {
    if (semSessao) {
      router.replace(APP_ROUTES.public.login);
    } else if (outroPapel) {
      router.replace(papelAtual ? rotaInicialDoPapel(papelAtual) : APP_ROUTES.public.login);
    }
  }, [semSessao, outroPapel, papelAtual, router]);

  // Enquanto o redirect do efeito acima acontece, não renderiza conteúdo privado.
  if (semSessao || outroPapel) {
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
