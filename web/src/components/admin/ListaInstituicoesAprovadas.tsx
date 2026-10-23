"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AsyncState from "@/components/ui/AsyncState";
import { formatarCnpj } from "@/lib/mascaras";
import { APP_ROUTES } from "@/lib/routes";
import { ApiError, mensagemDeErro } from "@/services/api";
import {
  encerrarInstituicao,
  listarInstituicoesAprovadas,
  reativarInstituicao,
  suspenderInstituicao,
  type InstituicaoAprovada,
} from "@/services/admin";

// Tipo da ação de encerrar, que precisa de confirmação "forte".
type ConfirmacaoEncerrar = { id: string; razaoSocial: string } | null;

export default function ListaInstituicoesAprovadas() {
  const router = useRouter();
  const [itens, setItens] = useState<InstituicaoAprovada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<unknown>(null);

  // id da instituição com uma ação em andamento (desabilita os botões dela).
  const [acaoEmId, setAcaoEmId] = useState<string | null>(null);
  // mensagens de feedback
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  // dialog de confirmação do encerrar
  const [confirmacao, setConfirmacao] = useState<ConfirmacaoEncerrar>(null);

  const carregar = useCallback(async () => {
    try {
      setItens(await listarInstituicoesAprovadas());
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

  // Executa uma ação (suspender/reativar/encerrar), trata erro e recarrega.
  async function executarAcao(
    id: string,
    acao: (id: string) => Promise<void>,
    mensagemSucesso: string,
  ) {
    setAcaoEmId(id);
    setErroAcao(null);
    try {
      await acao(id);
      setSucesso(mensagemSucesso);
      await carregar();
    } catch (e) {
      // 409 transição inválida, 404 não encontrada, 403 sem permissão — a API
      // responde em português; mensagemDeErro cobre os casos genéricos.
      const personalizadas: Record<number, string> = {
        409: "Esta ação não é válida para o estado atual da instituição.",
        404: "Instituição não encontrada. A lista pode estar desatualizada.",
        403: "Você não tem permissão para esta ação.",
      };
      setErroAcao(mensagemDeErro(e, personalizadas));
    } finally {
      setAcaoEmId(null);
    }
  }

  function confirmarEncerramento() {
    if (!confirmacao) return;
    const alvo = confirmacao;
    setConfirmacao(null);
    void executarAcao(
      alvo.id,
      encerrarInstituicao,
      `${alvo.razaoSocial} foi encerrada.`,
    );
  }

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", px: 2, py: 4 }}>
      <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Instituições aprovadas
      </Typography>

      <AsyncState
        loading={carregando}
        erro={erro}
        vazio={itens.length === 0}
        mensagemVazio="Nenhuma instituição aprovada no momento."
        onRetry={tentarNovamente}
      >
        <Stack component="ul" spacing={2} sx={{ listStyle: "none", p: 0, m: 0 }}>
          {itens.map((item) => {
            const ocupado = acaoEmId === item.id;
            const aprovada = item.estado === "APROVADA";
            const suspensa = item.estado === "SUSPENSA";

            return (
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
                    <Chip
                      label={suspensa ? "Suspensa" : "Aprovada"}
                      color={suspensa ? "warning" : "success"}
                      size="small"
                      sx={{ alignSelf: "flex-start" }}
                    />
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    CNPJ {formatarCnpj(item.cnpj)} · {item.causa}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.cidade}/{item.uf} · {item.email}
                  </Typography>

                  {/* Só as ações válidas para o estado atual. */}
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
                    {aprovada && (
                      <Button
                        variant="outlined"
                        color="warning"
                        disabled={ocupado}
                        onClick={() =>
                          executarAcao(
                            item.id,
                            suspenderInstituicao,
                            `${item.razaoSocial} foi suspensa.`,
                          )
                        }
                      >
                        Suspender
                      </Button>
                    )}

                    {suspensa && (
                      <Button
                        variant="outlined"
                        color="success"
                        disabled={ocupado}
                        onClick={() =>
                          executarAcao(
                            item.id,
                            reativarInstituicao,
                            `${item.razaoSocial} foi reativada.`,
                          )
                        }
                      >
                        Reativar
                      </Button>
                    )}

                    {aprovada && (
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={ocupado}
                        onClick={() =>
                          setConfirmacao({ id: item.id, razaoSocial: item.razaoSocial })
                        }
                      >
                        Encerrar
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </AsyncState>

      {/* Confirmação forte do encerramento (não tem volta). */}
      <Dialog
        open={confirmacao !== null}
        onClose={() => setConfirmacao(null)}
        aria-labelledby="titulo-encerrar"
      >
        <DialogTitle id="titulo-encerrar">Encerrar instituição?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Você está prestes a encerrar <strong>{confirmacao?.razaoSocial}</strong>.
            Esta ação é definitiva e não pode ser desfeita. A instituição sairá do
            catálogo das empresas.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmacao(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmarEncerramento}>
            Encerrar definitivamente
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={sucesso !== null}
        autoHideDuration={4000}
        onClose={() => setSucesso(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSucesso(null)}>
          {sucesso}
        </Alert>
      </Snackbar>

      <Snackbar
        open={erroAcao !== null}
        autoHideDuration={6000}
        onClose={() => setErroAcao(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setErroAcao(null)}>
          {erroAcao}
        </Alert>
      </Snackbar>
    </Box>
  );
}
