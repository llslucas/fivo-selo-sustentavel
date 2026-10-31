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
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AsyncState from "@/components/ui/AsyncState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { textoDoValor } from "@/lib/campanhas/formatacao";
import { APP_ROUTES } from "@/lib/routes";
import { ApiError, ehErroRecuperavel, mensagemDeErro } from "@/services/api";
import {
  MOTIVO_REJEICAO_MINIMO,
  aprovarAlteracao,
  aprovarCampanha,
  listarFilaCampanhas,
  rejeitarAlteracao,
  rejeitarCampanha,
  type ItemFilaCampanha,
} from "@/services/admin";

const MENSAGENS_DECISAO: Record<number, string> = {
  403: "Você não tem permissão para decidir sobre campanhas.",
  422: "O motivo informado é inválido. Revise e tente novamente.",
};

const ROTULOS_TIPO: Record<ItemFilaCampanha["tipo"], string> = {
  NOVA: "Nova",
  ALTERACAO: "Alteração",
};

type Decisao = "aprovacao" | "rejeicao";
type Aviso = { severidade: AlertColor; mensagem: string };

// "2026-11-01" vira "01/11/2026" sem passar por Date, para o fuso não mudar o dia.
function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function textoDaVigencia({ inicio, fim }: ItemFilaCampanha["vigencia"]): string {
  return fim
    ? `${formatarData(inicio)} a ${formatarData(fim)}`
    : `A partir de ${formatarData(inicio)}`;
}

// Fila de campanhas novas e de alterações de campanhas aprovadas, na ordem da
// API (submissão mais antiga primeiro). Cada tipo tem sua rota de decisão.
export default function FilaCampanhas() {
  const router = useRouter();
  const [itens, setItens] = useState<ItemFilaCampanha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<unknown>(null);

  // O item selecionado continua definido enquanto o diálogo fecha, pra o
  // texto não sumir durante a animação de saída.
  const [decisao, setDecisao] = useState<Decisao | null>(null);
  const [selecionado, setSelecionado] = useState<ItemFilaCampanha | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroDecisao, setErroDecisao] = useState<unknown>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  const motivoCurto = motivo.trim().length < MOTIVO_REJEICAO_MINIMO;

  const carregar = useCallback(async () => {
    try {
      setItens(await listarFilaCampanhas());
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

  function abrirDecisao(tipo: Decisao, item: ItemFilaCampanha) {
    setSelecionado(item);
    setMotivo("");
    setErroDecisao(null);
    setDecisao(tipo);
  }

  function fecharDecisao() {
    if (!enviando) setDecisao(null);
  }

  async function decidir(enviar: () => Promise<void>, mensagemSucesso: string) {
    if (!selecionado || enviando) return;
    const item = selecionado;

    setEnviando(true);
    setErroDecisao(null);
    try {
      await enviar();
      setItens((atuais) => atuais.filter((i) => i.campanhaId !== item.campanhaId));
      setDecisao(null);
      setAviso({ severidade: "success", mensagem: mensagemSucesso });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.replace(APP_ROUTES.public.login);
        return;
      }
      // O item mudou por outro caminho (outra decisão, beneficiada fora do
      // catálogo): mostra o motivo da API e atualiza a fila.
      if (e instanceof ApiError && (e.status === 409 || e.status === 404)) {
        setDecisao(null);
        setAviso({ severidade: "warning", mensagem: mensagemDeErro(e) });
        void carregar();
        return;
      }
      setErroDecisao(e);
    } finally {
      setEnviando(false);
    }
  }

  function aprovar() {
    if (!selecionado) return;
    const { campanhaId, nome, tipo } = selecionado;
    void decidir(
      () => (tipo === "NOVA" ? aprovarCampanha(campanhaId) : aprovarAlteracao(campanhaId)),
      tipo === "NOVA" ? `${nome} foi aprovada.` : `A alteração de ${nome} foi aprovada.`,
    );
  }

  function rejeitar(e: React.FormEvent) {
    e.preventDefault();
    if (!selecionado || motivoCurto) return;
    const { campanhaId, nome, tipo } = selecionado;
    const texto = motivo.trim();
    void decidir(
      () =>
        tipo === "NOVA"
          ? rejeitarCampanha(campanhaId, texto)
          : rejeitarAlteracao(campanhaId, texto),
      tipo === "NOVA"
        ? `${nome} foi rejeitada. O motivo será enviado por e-mail.`
        : `A alteração de ${nome} foi rejeitada. O motivo será enviado por e-mail.`,
    );
  }

  const erroDaDecisao =
    erroDecisao !== null ? mensagemDeErro(erroDecisao, MENSAGENS_DECISAO) : null;

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", px: 2, py: 4 }}>
      <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Campanhas em análise
      </Typography>

      <AsyncState
        loading={carregando}
        erro={erro}
        vazio={itens.length === 0}
        mensagemVazio="Nenhuma campanha aguardando análise."
        onRetry={tentarNovamente}
      >
        <Stack component="ul" spacing={2} sx={{ listStyle: "none", p: 0, m: 0 }}>
          {itens.map((item) => (
            <Paper
              key={item.campanhaId}
              component="li"
              variant="outlined"
              data-testid="item-fila-campanha"
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
                    sx={{ fontWeight: 600, overflowWrap: "anywhere" }}
                  >
                    {item.nome}
                  </Typography>
                  <Chip
                    label={ROTULOS_TIPO[item.tipo]}
                    size="small"
                    color={item.tipo === "NOVA" ? "primary" : "warning"}
                    sx={{ alignSelf: "flex-start" }}
                  />
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {item.empresa}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Beneficiada: {item.beneficiada.nome}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {textoDoValor(item.regraDoacao)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vigência: {textoDaVigencia(item.vigencia)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enviada em {new Date(item.submetidoEm).toLocaleDateString("pt-BR")}
                </Typography>

                <Stack
                  data-testid="acoes-campanha"
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
        aria-labelledby="dialogo-aprovar-campanha-titulo"
        aria-describedby="dialogo-aprovar-campanha-descricao"
      >
        <DialogTitle id="dialogo-aprovar-campanha-titulo">
          {selecionado?.tipo === "ALTERACAO" ? "Aprovar alteração" : "Aprovar campanha"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="dialogo-aprovar-campanha-descricao">
            {selecionado?.tipo === "ALTERACAO" ? (
              <>
                Os novos valores de <strong>{selecionado?.nome}</strong> passarão a
                valer na página pública. Confirma a aprovação?
              </>
            ) : (
              <>
                <strong>{selecionado?.nome}</strong> será publicada e a empresa poderá
                baixar o selo. Confirma a aprovação?
              </>
            )}
          </DialogContentText>

          {erroDaDecisao && (
            <ErrorMessage
              mensagem={erroDaDecisao}
              onRetry={ehErroRecuperavel(erroDecisao) && !enviando ? aprovar : undefined}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={fecharDecisao} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={aprovar} disabled={enviando}>
            {enviando ? <CircularProgress size={22} color="inherit" /> : "Aprovar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diferente do DialogoMotivoRejeicao, o botão de confirmar só habilita
          com o motivo no tamanho mínimo (VIT-12 AC5). */}
      <Dialog
        open={decisao === "rejeicao"}
        onClose={fecharDecisao}
        fullWidth
        maxWidth="sm"
        aria-labelledby="dialogo-rejeitar-campanha-titulo"
        aria-describedby="dialogo-rejeitar-campanha-descricao"
        slotProps={{ paper: { component: "form", onSubmit: rejeitar } }}
      >
        <DialogTitle id="dialogo-rejeitar-campanha-titulo">
          {selecionado?.tipo === "ALTERACAO" ? "Rejeitar alteração" : "Rejeitar campanha"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="dialogo-rejeitar-campanha-descricao" sx={{ mb: 2 }}>
            Explique por que <strong>{selecionado?.nome}</strong> não foi aprovada. A
            empresa recebe este motivo por e-mail.
          </DialogContentText>

          {erroDaDecisao && <ErrorMessage mensagem={erroDaDecisao} sx={{ mb: 2 }} />}

          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Motivo da rejeição"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={enviando}
            helperText={`${motivo.trim().length}/${MOTIVO_REJEICAO_MINIMO} caracteres no mínimo`}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={fecharDecisao} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={enviando || motivoCurto}
          >
            {enviando ? <CircularProgress size={22} color="inherit" /> : "Rejeitar"}
          </Button>
        </DialogActions>
      </Dialog>

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
