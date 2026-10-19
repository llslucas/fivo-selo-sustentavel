"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AsyncState from "@/components/ui/AsyncState";
import { formatarCnpj } from "@/lib/mascaras";
import { APP_ROUTES } from "@/lib/routes";
import { ApiError } from "@/services/api";
import { listarFilaInstituicoes, type ItemFilaInstituicao } from "@/services/admin";

// Fila de instituições pendentes de aprovação, da mais antiga para a mais
// recente (a ordem já vem pronta da API). Os botões de documento, aprovar,
// rejeitar e suspender entram no espaço reservado de cada linha (F5, F6, F7).
export default function FilaInstituicoes() {
  const router = useRouter();
  const [itens, setItens] = useState<ItemFilaInstituicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<unknown>(null);

  const carregar = useCallback(async () => {
    try {
      setItens(await listarFilaInstituicoes());
      setErro(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace(APP_ROUTES.public.login);
        return;
      }
      setErro(e);
    } finally {
      setCarregando(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial intencional, roda uma vez só
    void carregar();
  }, [carregar]);

  function tentarNovamente() {
    setCarregando(true);
    void carregar();
  }

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", px: 2, py: 4 }}>
      <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Instituições em análise
      </Typography>

      <AsyncState
        loading={carregando}
        erro={erro}
        vazio={itens.length === 0}
        mensagemVazio="Nenhuma instituição aguardando análise."
        onRetry={tentarNovamente}
      >
        <Stack component="ul" spacing={2} sx={{ listStyle: "none", p: 0, m: 0 }}>
          {itens.map((item) => (
            <Paper key={item.id} component="li" variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ justifyContent: "space-between" }}
                >
                  <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {item.razaoSocial}
                  </Typography>
                  <Chip label={item.causa} size="small" sx={{ alignSelf: "flex-start" }} />
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  CNPJ {formatarCnpj(item.cnpj)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.cidade}/{item.uf} · {item.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cadastrada em {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
                </Typography>

                {item.cnpjCoincideComEmpresa && (
                  <Alert severity="warning">
                    Este CNPJ também está cadastrado como empresa.
                  </Alert>
                )}

                {/* Espaço reservado para os botões das F5, F6 e F7. */}
                <Box data-testid="acoes-instituicao" />
              </Stack>
            </Paper>
          ))}
        </Stack>
      </AsyncState>
    </Box>
  );
}