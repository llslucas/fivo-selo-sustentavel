"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert, { type AlertColor } from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
  aprovarEmpresa,
  listarFilaEmpresas,
  rejeitarEmpresa,
  type ItemFilaEmpresa,
} from "@/services/admin";

const MENSAGENS_DECISAO: Record<number, string> = {
  403: "Você não tem permissão para decidir sobre empresas.",
  422: "O motivo informado é inválido. Revise e tente novamente.",
};

type Decisao = "aprovacao" | "rejeicao";
type Aviso = { severidade: AlertColor; mensagem: string };

// Fila de empresas pendentes de aprovação, da mais antiga para a mais recente
// (a ordem já vem pronta da API). Cada linha tem os botões de aprovar e
// rejeitar (F7/F8). Diferente da fila de instituições, empresas não têm
// documento de validação, então não há estado nem ação de documento.
export default function FilaEmpresas() {
  const router = useRouter();
  const [itens, setItens] = useState<ItemFilaEmpresa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<unknown>(null);

  // A empresa selecionada continua definida enquanto o diálogo fecha, pra o
  // texto não sumir durante a animação de saída.
  const [decisao, setDecisao] = useState<Decisao | null>(null);
  const [selecionada, setSelecionada] = useState<ItemFilaEmpresa | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroDecisao, setErroDecisao] = useState<unknown>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const carregar = useCallback(async () => {
    try {
      setItens(await listarFilaEmpresas());
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

  function abrirDecisao(tipo: Decisao, item: ItemFilaEmpresa) {
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
      // A empresa saiu da fila por outro caminho: avisa e atualiza a lista.
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
      // 403 ("sem permissão") e 422 ("motivo inválido") ganham mensagem própria
      // via MENSAGENS_DECISAO nos diálogos; os demais caem no padrão de api.ts.
      setErroDecisao(e);
    } finally {
      setEnviando(false);
    }
  }

  function aprovar() {
    if (!selecionada) return;
    const { id, razaoSocial } = selecionada;
    void decidir(() => aprovarEmpresa(id), `${razaoSocial} foi aprovada.`);
  }

  function rejeitar(motivo: string) {
    if (!selecionada) return;
    const { id, razaoSocial } = selecionada;
    void decidir(
      () => rejeitarEmpresa(id, motivo),
      `${razaoSocial} foi rejeitada. O motivo será enviado por e-mail.`,
    );
  }

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", px: 2, py: 4 }}>
      <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Empresas em análise
      </Typography>

      <AsyncState
        loading={carregando}
        erro={erro}
        vazio={itens.length === 0}
        mensagemVazio="Nenhuma empresa aguardando análise."
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
                <Typography
                  component="h2"
                  variant="subtitle1"
                  sx={{ fontWeight: 600 }}
                >
                  {item.razaoSocial}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  CNPJ {formatarCnpj(item.cnpj)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.email}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Cadastrada em{" "}
                  {new Date(item.criadoEm).toLocaleDateString("pt-BR")}
                </Typography>

                <Stack
                  data-testid="acoes-empresa"
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
        aria-labelledby="dialogo-aprovar-empresa-titulo"
        aria-describedby="dialogo-aprovar-empresa-descricao"
      >
        <DialogTitle id="dialogo-aprovar-empresa-titulo">
          Aprovar empresa
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="dialogo-aprovar-empresa-descricao">
            <strong>{selecionada?.razaoSocial}</strong> passará a ter acesso à
            plataforma. Confirma a aprovação?
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
        titulo="Rejeitar empresa"
        descricao={
          <>
            Explique por que <strong>{selecionada?.razaoSocial}</strong> não foi
            aprovada. A empresa recebe este motivo por e-mail.
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
