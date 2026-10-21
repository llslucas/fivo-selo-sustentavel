"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert, { type AlertColor } from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DialogoMotivoRejeicao from "@/components/admin/DialogoMotivoRejeicao";
import AsyncState from "@/components/ui/AsyncState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { formatarCnpj } from "@/lib/mascaras";
import { APP_ROUTES } from "@/lib/routes";
import { ApiError, ehErroRecuperavel, mensagemDeErro } from "@/services/api";
import {
  aprovarInstituicao,
  listarFilaInstituicoes,
  rejeitarInstituicao,
  type ItemFilaInstituicao,
} from "@/services/admin";

const MENSAGENS_DECISAO: Record<number, string> = {
  403: "Você não tem permissão para decidir sobre instituições.",
  503: "O documento de validação está temporariamente indisponível. Tente novamente em instantes.",
};

type Decisao = "aprovacao" | "rejeicao";
type Aviso = { severidade: AlertColor; mensagem: string };

// Fila de instituições pendentes de aprovação, da mais antiga para a mais
// recente (a ordem já vem pronta da API). Cada linha tem os botões de aprovar
// e rejeitar (F6); os de documento e suspender entram no mesmo espaço (F5, F7).
export default function FilaInstituicoes() {
  const router = useRouter();
  const [itens, setItens] = useState<ItemFilaInstituicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<unknown>(null);

  // A instituição selecionada continua definida enquanto o diálogo fecha,
  // pra o texto não sumir durante a animação de saída.
  const [decisao, setDecisao] = useState<Decisao | null>(null);
  const [selecionada, setSelecionada] = useState<ItemFilaInstituicao | null>(
    null,
  );
  const [enviando, setEnviando] = useState(false);
  const [erroDecisao, setErroDecisao] = useState<unknown>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

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

  function abrirDecisao(tipo: Decisao, item: ItemFilaInstituicao) {
    setSelecionada(item);
    setErroDecisao(null);
    setDecisao(tipo);
  }

  function fecharDecisao() {
    if (!enviando) setDecisao(null);
  }

  async function decidir(enviar: () => Promise<void>, mensagemSucesso: string) {
    if (!selecionada || enviando) return;
    const item = selecionada;

    setEnviando(true);
    setErroDecisao(null);
    try {
      await enviar();
      setItens((atuais) => atuais.filter((i) => i.id !== item.id));
      setDecisao(null);
      setAviso({ severidade: "success", mensagem: mensagemSucesso });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace(APP_ROUTES.public.login);
        return;
      }
      // A instituição saiu da fila por outro caminho: avisa e atualiza a lista.
      if (e instanceof ApiError && (e.status === 409 || e.status === 404)) {
        setDecisao(null);
        setAviso({
          severidade: "warning",
          mensagem:
            e.status === 409
              ? `Outra pessoa já decidiu sobre ${item.razaoSocial}. A lista foi atualizada.`
              : `${item.razaoSocial} não foi encontrada. A lista foi atualizada.`,
        });
        void carregar();
        return;
      }
      setErroDecisao(e);
    } finally {
      setEnviando(false);
    }
  }

  function aprovar() {
    if (!selecionada) return;
    const { id, razaoSocial } = selecionada;
    void decidir(() => aprovarInstituicao(id), `${razaoSocial} foi aprovada.`);
  }

  function rejeitar(motivo: string) {
    if (!selecionada) return;
    const { id, razaoSocial } = selecionada;
    void decidir(
      () => rejeitarInstituicao(id, motivo),
      `${razaoSocial} foi rejeitada. O motivo será enviado por e-mail.`,
    );
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
        <Stack
          component="ul"
          spacing={2}
          sx={{ listStyle: "none", p: 0, m: 0 }}
        >
          {itens.map((item) => (
            <Paper
              key={item.id}
              component="li"
              variant="outlined"
              sx={{ p: 2 }}
            >
              <Stack spacing={1}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ justifyContent: "space-between" }}
                >
                  <Typography
                    component="h2"
                    variant="subtitle1"
                    sx={{ fontWeight: 600 }}
                  >
                    {item.razaoSocial}
                  </Typography>
                  <Chip
                    label={item.causa}
                    size="small"
                    sx={{ alignSelf: "flex-start" }}
                  />
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  CNPJ {formatarCnpj(item.cnpj)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.cidade}/{item.uf} · {item.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cadastrada em{" "}
                  {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
                </Typography>

                {item.cnpjCoincideComEmpresa && (
                  <Alert severity="warning">
                    Este CNPJ também está cadastrado como empresa.
                  </Alert>
                )}

                {/* Ações da linha. Os botões das F5 e F7 entram aqui também. */}
                <Stack
                  data-testid="acoes-instituicao"
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: "flex-end", pt: 1 }}
                >
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    disabled={enviando}
                    onClick={() => abrirDecisao("rejeicao", item)}
                  >
                    Rejeitar
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={enviando}
                    onClick={() => abrirDecisao("aprovacao", item)}
                  >
                    Aprovar
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </AsyncState>

      <Dialog
        open={decisao === "aprovacao"}
        onClose={fecharDecisao}
        fullWidth
        maxWidth="xs"
        aria-labelledby="dialogo-aprovar-instituicao-titulo"
        aria-describedby="dialogo-aprovar-instituicao-descricao"
      >
        <DialogTitle id="dialogo-aprovar-instituicao-titulo">
          Aprovar instituição
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="dialogo-aprovar-instituicao-descricao">
            <strong>{selecionada?.razaoSocial}</strong> passará a aparecer no
            catálogo de instituições que as empresas podem apoiar. Confirma a
            aprovação?
          </DialogContentText>

          {erroDecisao !== null && (
            <ErrorMessage
              mensagem={mensagemDeErro(erroDecisao, MENSAGENS_DECISAO)}
              onRetry={
                ehErroRecuperavel(erroDecisao) && !enviando
                  ? aprovar
                  : undefined
              }
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={fecharDecisao} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={aprovar} disabled={enviando}>
            {enviando ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "Aprovar"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <DialogoMotivoRejeicao
        open={decisao === "rejeicao"}
        titulo="Rejeitar instituição"
        descricao={
          <>
            Explique por que <strong>{selecionada?.razaoSocial}</strong> não foi
            aprovada. A instituição recebe este motivo por e-mail.
          </>
        }
        enviando={enviando}
        erro={
          erroDecisao !== null
            ? mensagemDeErro(erroDecisao, MENSAGENS_DECISAO)
            : null
        }
        onCancelar={fecharDecisao}
        onConfirmar={rejeitar}
      />

      <Snackbar
        open={aviso !== null}
        autoHideDuration={6000}
        onClose={() => setAviso(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={aviso?.severidade ?? "success"}
          variant="filled"
          onClose={() => setAviso(null)}
          sx={{ width: "100%" }}
        >
          {aviso?.mensagem}
        </Alert>
      </Snackbar>
    </Box>
  );
}
