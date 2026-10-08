"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AsyncState from "@/components/ui/AsyncState";
import { ApiError, getEmpresaAtual } from "@/lib/api";
import { APP_ROUTES } from "@/lib/routes";

// Protege as telas do dashboard: confirma que existe uma sessão válida antes
// de mostrar qualquer conteúdo. Sem sessão, manda pro login; outras falhas
// (rede, servidor, permissão) aparecem na tela.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);
  const [erro, setErro] = useState<unknown>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;

    getEmpresaAtual()
      .then(() => {
        if (!cancelado) setAutorizado(true);
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace(APP_ROUTES.public.login);
        } else {
          setErro(e);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [router, tentativa]);

  function tentarNovamente() {
    setErro(null);
    setTentativa((t) => t + 1);
  }

  return (
    <AsyncState loading={!autorizado && !erro} erro={erro} onRetry={tentarNovamente}>
      {children}
    </AsyncState>
  );
}
