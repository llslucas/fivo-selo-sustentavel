"use client";

// Detalhe e correção de uma campanha da empresa (vitrine-e-selo T36, VIT-11
// AC1–AC6). Edita só em RASCUNHO e REJEITADA; em APROVADA oferece o selo e a
// página pública.

import { useEffect, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import StepSobreCampanha from "@/components/campaign-wizard/steps/StepSobreCampanha";
import StepRegraVigencia from "@/components/campaign-wizard/steps/StepRegraVigencia";
import type { CampaignWizardData } from "@/lib/campaign-wizard/types";
import { alteracoes, dadosDoWizard } from "@/lib/campanhas/edicao";
import { rotuloDoStatus, textoDoValor } from "@/lib/campanhas/formatacao";
import { APP_ROUTES } from "@/lib/routes";
import { ApiError, mensagemDeErro } from "@/services/api";
import { baixarArquivo } from "@/services/arquivos";
import {
  baixarSelo,
  detalharCampanha,
  editarCampanha,
  enviarCapa,
  listarCampanhas,
  submeterCampanha,
  type CampanhaDetalhe,
  type Vigencia,
} from "@/services/campanhas";
import { listarBeneficiadas } from "@/services/instituicoes";

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Carregamento =
  | { estado: "carregando" }
  | { estado: "nao-encontrada" }
  | { estado: "erro"; mensagem: string }
  | { estado: "carregada"; campanha: CampanhaDetalhe };

// Dados que não vêm no detalhe e saem de outras rotas. Se alguma falhar, a
// página abre do mesmo jeito, sem aquele dado.
type Complementos = {
  beneficiadaNome: string | null;
  capaUrl: string | null;
  urlPublica: string | null;
};

const SEM_COMPLEMENTOS: Complementos = { beneficiadaNome: null, capaUrl: null, urlPublica: null };

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function textoDaVigencia(vigencia: Vigencia | null): string {
  if (!vigencia) return "Vigência não definida";
  return vigencia.fim
    ? `${formatarData(vigencia.inicio)} a ${formatarData(vigencia.fim)}`
    : `A partir de ${formatarData(vigencia.inicio)}`;
}

async function nomeDaBeneficiada(campanha: CampanhaDetalhe): Promise<string | null> {
  if (!campanha.beneficiada) return null;
  const catalogo = await listarBeneficiadas().catch(() => []);
  return catalogo.find((b) => b.id === campanha.beneficiada?.id)?.nome ?? null;
}

async function urlDaCapa(campanha: CampanhaDetalhe): Promise<string | null> {
  if (!campanha.capaArquivoId) return null;
  const capa = await baixarArquivo(campanha.capaArquivoId).catch(() => null);
  return capa ? URL.createObjectURL(capa) : null;
}

// O detalhe não traz a URL pública; ela só vem na lista de campanhas.
async function urlPublicaDe(campanha: CampanhaDetalhe): Promise<string | null> {
  if (campanha.status !== "APROVADA") return null;
  const lista = await listarCampanhas().catch(() => []);
  return lista.find((c) => c.id === campanha.id)?.urlPublica ?? null;
}

function salvarNoComputador(arquivo: Blob, nome: string) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DetalheCampanha({ id }: { id: string }) {
  const [carregamento, setCarregamento] = useState<Carregamento>({ estado: "carregando" });
  const [complementos, setComplementos] = useState<Complementos>(SEM_COMPLEMENTOS);
  // Muda a cada salvamento ou envio, para buscar a campanha de novo.
  const [versao, setVersao] = useState(0);
  const [edicao, setEdicao] = useState<{
    original: CampaignWizardData;
    dados: CampaignWizardData;
  } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    let capaUrl: string | null = null;

    async function carregar() {
      try {
        const campanha = await detalharCampanha(id);
        if (!ativo) return;
        setCarregamento({ estado: "carregada", campanha });

        const [beneficiadaNome, capa, urlPublica] = await Promise.all([
          nomeDaBeneficiada(campanha),
          urlDaCapa(campanha),
          urlPublicaDe(campanha),
        ]);
        capaUrl = capa;
        if (ativo) setComplementos({ beneficiadaNome, capaUrl: capa, urlPublica });
      } catch (e) {
        if (!ativo) return;
        setCarregamento(
          e instanceof ApiError && e.status === 404
            ? { estado: "nao-encontrada" }
            : { estado: "erro", mensagem: mensagemDeErro(e) },
        );
      }
    }

    void carregar();

    return () => {
      ativo = false;
      if (capaUrl) URL.revokeObjectURL(capaUrl);
    };
  }, [id, versao]);

  if (carregamento.estado === "carregando") {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <CircularProgress size={24} />
          <Typography>Carregando campanha...</Typography>
        </Stack>
      </Container>
    );
  }

  if (carregamento.estado === "nao-encontrada") {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Campanha não encontrada
          </Typography>
          <Button component={Link} href={APP_ROUTES.private.campanhas} variant="contained">
            Voltar para minhas campanhas
          </Button>
        </Stack>
      </Container>
    );
  }

  if (carregamento.estado === "erro") {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Alert severity="error" role="alert">
          {carregamento.mensagem}
        </Alert>
      </Container>
    );
  }

  const { campanha } = carregamento;
  const corrigivel = campanha.status === "RASCUNHO" || campanha.status === "REJEITADA";

  async function executar(acao: () => Promise<void>) {
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await acao();
    } catch (e) {
      // Os campos ficam como estão, para a empresa corrigir e tentar de novo.
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function salvarEdicao() {
    if (!edicao) return;
    const mudou = alteracoes(edicao.original, edicao.dados);
    if (Object.keys(mudou).length > 0) await editarCampanha(id, mudou);
    if (edicao.dados.capa) await enviarCapa(id, edicao.dados.capa);
  }

  function abrirEdicao() {
    const dados = dadosDoWizard(campanha, complementos.beneficiadaNome);
    setErro(null);
    setEdicao({ original: dados, dados });
  }

  function salvar() {
    void executar(async () => {
      await salvarEdicao();
      setEdicao(null);
      setVersao((v) => v + 1);
    });
  }

  // O que foi alterado e ainda não salvo vai junto, antes da submissão.
  function enviarParaAnalise() {
    void executar(async () => {
      await salvarEdicao();
      await submeterCampanha(id);
      setEdicao(null);
      setVersao((v) => v + 1);
    });
  }

  function baixar() {
    void executar(async () => {
      const selo = await baixarSelo(id);
      salvarNoComputador(selo.arquivo, selo.nomeArquivo);
    });
  }

  const aviso = erro ? (
    <Alert severity="error" role="alert">
      {erro}
    </Alert>
  ) : null;

  const botaoEnviar = (
    <Button variant="contained" onClick={enviarParaAnalise} disabled={enviando}>
      Enviar para análise
    </Button>
  );

  return (
    <Box sx={{ bgcolor: "background.paper", minHeight: "100vh" }}>
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={4}>
          <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
            <Chip label={rotuloDoStatus(campanha.status)} />
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
            >
              {campanha.nome}
            </Typography>
          </Stack>

          {campanha.status === "REJEITADA" && campanha.motivoUltimaRejeicao && (
            <Alert severity="warning">
              <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
                Motivo da rejeição
              </Typography>
              <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                {campanha.motivoUltimaRejeicao}
              </Typography>
            </Alert>
          )}

          {campanha.status === "EM_ANALISE" && (
            <Alert severity="info">Campanha em análise pela Fivo Lab.</Alert>
          )}

          {edicao ? (
            <Stack spacing={4}>
              <StepSobreCampanha
                data={edicao.dados}
                onChange={(p) => setEdicao({ ...edicao, dados: { ...edicao.dados, ...p } })}
              />
              <StepRegraVigencia
                data={edicao.dados}
                onChange={(p) => setEdicao({ ...edicao, dados: { ...edicao.dados, ...p } })}
              />
              {aviso}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button variant="outlined" onClick={salvar} disabled={enviando}>
                  Salvar alterações
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    setErro(null);
                    setEdicao(null);
                  }}
                  disabled={enviando}
                >
                  Cancelar
                </Button>
                {botaoEnviar}
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={4}>
              {complementos.capaUrl && (
                <Box
                  component="img"
                  src={complementos.capaUrl}
                  alt="Capa da campanha"
                  sx={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 2 }}
                />
              )}

              <Box
                component="dl"
                sx={{
                  m: 0,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "200px 1fr" },
                  rowGap: 1.5,
                  columnGap: 2,
                  "& dt": { fontWeight: 700 },
                  "& dd": { m: 0, overflowWrap: "anywhere" },
                }}
              >
                <dt>Descrição</dt>
                <dd>{campanha.descricao ?? "Sem descrição"}</dd>
                <dt>Beneficiada</dt>
                <dd>{campanha.beneficiada ? (complementos.beneficiadaNome ?? "—") : "Não definida"}</dd>
                <dt>Regra de doação</dt>
                <dd>{textoDoValor(campanha.regraDoacao)}</dd>
                <dt>Meta</dt>
                <dd>{campanha.meta ? REAIS.format(Number(campanha.meta)) : "Sem meta"}</dd>
                <dt>Vigência</dt>
                <dd>{textoDaVigencia(campanha.vigencia)}</dd>
              </Box>

              {aviso}

              {corrigivel && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button variant="outlined" onClick={abrirEdicao} disabled={enviando}>
                    Editar
                  </Button>
                  {botaoEnviar}
                </Stack>
              )}

              {campanha.status === "APROVADA" && (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button variant="contained" onClick={baixar} disabled={enviando}>
                    Baixar selo
                  </Button>
                  {complementos.urlPublica && (
                    <Button
                      component="a"
                      href={complementos.urlPublica}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                    >
                      Ver página pública
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
