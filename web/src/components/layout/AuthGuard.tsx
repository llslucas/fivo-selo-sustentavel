"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { getEmpresaAtual } from "@/lib/api";
import { APP_ROUTES } from "@/lib/routes";

// Protege as telas do dashboard: confirma que existe uma sessão válida antes
// de mostrar qualquer conteúdo. Sem sessão, manda pro login.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    let cancelado = false;

    getEmpresaAtual()
      .then(() => {
        if (!cancelado) setAutorizado(true);
      })
      .catch(() => {
        if (!cancelado) router.replace(APP_ROUTES.public.login);
      });

    return () => {
      cancelado = true;
    };
  }, [router]);

  if (!autorizado) {
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

  return <>{children}</>;
}
