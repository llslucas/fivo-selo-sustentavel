"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AsyncState from "@/components/ui/AsyncState";
import { APP_ROUTES } from "@/lib/routes";
import { ApiError, mensagemDeErro } from "@/services/api";
import {
  CausaComInstituicoesError,
  criarCausa,
  editarCausa,
  inativarCausa,
  listarCausas,
  type Causa,
  type DadosCausa,
} from "@/services/causas";
import FormularioCausa from "./FormularioCausa";

export default function ListaCausas() {
  const router = useRouter();
  const [itens, setItens] = useState<Causa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<unknown>(null);

  const [enviando, setEnviando] = useState(false);
  const [erroNome, setErroNome] = useState<string | undefined>();
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  // controle do formulário: null = criando; uma Causa = editando aquela
  const [editando, setEditando] = useState<Causa | null>(null);
  const [mostrandoForm, setMostrandoForm] = useState(false);

  // dialog de desativar
  const [paraDesativar, setParaDesativar] = useState<Causa | null>(null);
  const [instituicoesBloqueando, setInstituicoesBloqueando] = useState<string[] | null>(null);

  const carregar = useCallback(async () => {
    try {
      setItens(await listarCausas());
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial intencional
    void carregar();
  }, [carregar]);

  function tentarNovamente() {
    setCarregando(true);
    void carregar();
  }

  function abrirCriar() {
    setEditando(null);
    setErroNome(undefined);
    setMostrandoForm(true);
  }

  function abrirEditar(causa: Causa) {
    setEditando(causa);
    setErroNome(undefined);
    setMostrandoForm(true);
  }

  function fecharForm() {
    setMostrandoForm(false);
    setEditando(null);
    setErroNome(undefined);
  }

  async function aoSalvar(dados: DadosCausa) {
    setEnviando(true);
    setErroNome(undefined);
    setErroGeral(null);
    try {
      if (editando) {
        await editarCausa(editando.id, dados);
        setSucesso("Causa atualizada.");
      } else {
        await criarCausa(dados);
        setSucesso("Causa criada.");
      }
      fecharForm();
      await carregar();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setErroNome("Causa já cadastrada");
      } else if (e instanceof ApiError && e.status === 422) {
        setErroNome("Preencha nome e descrição corretamente.");
      } else {
        setErroGeral(mensagemDeErro(e));
      }
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarDesativar() {
    if (!paraDesativar) return;
    const alvo = paraDesativar;
    setEnviando(true);
    setErroGeral(null);
    setInstituicoesBloqueando(null);
    try {
      await inativarCausa(alvo.id);
      setParaDesativar(null);
      setSucesso(`"${alvo.nome}" foi desativada.`);
      await carregar();
    } catch (e) {
      if (e instanceof CausaComInstituicoesError) {
        // mantém o dialog aberto, trocando o conteúdo pela lista de instituições
        setInstituicoesBloqueando(e.instituicoes);
      } else {
        setParaDesativar(null);
        setErroGeral(mensagemDeErro(e));
      }
    } finally {
      setEnviando(false);
    }
  }

  function fecharDesativar() {
    setParaDesativar(null);
    setInstituicoesBloqueando(null);
  }

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", px: 2, py: 4 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ justifyContent: "space-between", mb: 3 }}
      >
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
          Causas
        </Typography>
        {!mostrandoForm && (
          <Button variant="contained" onClick={abrirCriar}>
            Nova causa
          </Button>
        )}
      </Stack>

      {mostrandoForm && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            {editando ? "Editar causa" : "Nova causa"}
          </Typography>
          <FormularioCausa
            causaInicial={editando ?? undefined}
            enviando={enviando}
            erroNome={erroNome}
            onSalvar={aoSalvar}
            onCancelar={fecharForm}
          />
        </Paper>
      )}

      <AsyncState
        loading={carregando}
        erro={erro}
        vazio={itens.length === 0}
        mensagemVazio="Nenhuma causa ativa. Crie a primeira."
        onRetry={tentarNovamente}
      >
        <List disablePadding>
          {itens.map((causa) => (
            <Paper key={causa.id} variant="outlined" sx={{ mb: 2 }}>
              <ListItem
                sx={{
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "stretch", sm: "center" },
                  gap: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {causa.nome}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {causa.descricao}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" disabled={enviando} onClick={() => abrirEditar(causa)}>
                    Editar
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    disabled={enviando}
                    onClick={() => setParaDesativar(causa)}
                  >
                    Desativar
                  </Button>
                </Stack>
              </ListItem>
            </Paper>
          ))}
        </List>
      </AsyncState>

      {/* Dialog de desativar — dois conteúdos: confirmação normal ou bloqueio. */}
      <Dialog open={paraDesativar !== null} onClose={fecharDesativar} aria-labelledby="titulo-desativar">
        <DialogTitle id="titulo-desativar">
          {instituicoesBloqueando ? "Não é possível desativar" : "Desativar causa?"}
        </DialogTitle>
        <DialogContent>
          {instituicoesBloqueando ? (
            <>
              <DialogContentText>
                Esta causa tem instituições aprovadas vinculadas. Elas precisam ser
                inativadas ou remanejadas para outra causa antes:
              </DialogContentText>
              <List dense>
                {instituicoesBloqueando.map((nome) => (
                  <ListItem key={nome} sx={{ py: 0 }}>{nome}</ListItem>
                ))}
              </List>
            </>
          ) : (
            <DialogContentText>
              A causa <strong>{paraDesativar?.nome}</strong> deixará de aparecer para
              novas instituições. Deseja continuar?
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDesativar}>Fechar</Button>
          {!instituicoesBloqueando && (
            <Button color="error" variant="contained" disabled={enviando} onClick={confirmarDesativar}>
              Desativar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={sucesso !== null}
        autoHideDuration={4000}
        onClose={() => setSucesso(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSucesso(null)}>{sucesso}</Alert>
      </Snackbar>

      <Snackbar
        open={erroGeral !== null}
        autoHideDuration={6000}
        onClose={() => setErroGeral(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setErroGeral(null)}>{erroGeral}</Alert>
      </Snackbar>
    </Box>
  );
}
