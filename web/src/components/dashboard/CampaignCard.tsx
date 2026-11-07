"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AsyncState from "@/components/ui/AsyncState";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { mensagemDeErro } from "@/services/api";
import {
  baixarSelo,
  listarCampanhas,
  type CampanhaResumo,
  type StatusCampanha,
} from "@/services/campanhas";
import { rotuloDoStatus, textoDoValor } from "@/lib/campanhas/formatacao";

// Cards de campanha da área da empresa (vitrine-e-selo VIT-03 e VIT-05 AC9).

const coresDoStatus: Record<StatusCampanha, { bg: string; color: string }> = {
  RASCUNHO: { bg: "#F3F3F1", color: "#5F5E5A" },
  EM_ANALISE: { bg: "#FAEEDA", color: "#854F0B" },
  APROVADA: { bg: "#E1F5EE", color: "#0F6E56" },
  REJEITADA: { bg: "#FCEBEB", color: "#A32D2D" },
};

// Dispara o download do Blob e libera a URL temporária logo depois do clique.
function salvarNoComputador(arquivo: Blob, nome: string) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

export function CampaignCard({ campanha }: { campanha: CampanhaResumo }) {
  const [baixando, setBaixando] = useState(false);
  const [erroSelo, setErroSelo] = useState<string | null>(null);
  const cores = coresDoStatus[campanha.status];
  const aprovada = campanha.status === "APROVADA";

  async function baixar() {
    setBaixando(true);
    setErroSelo(null);
    try {
      const { arquivo, nomeArquivo } = await baixarSelo(campanha.id);
      salvarNoComputador(arquivo, nomeArquivo);
    } catch (e) {
      setErroSelo(mensagemDeErro(e));
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Box
      component="article"
      aria-label={campanha.nome}
      sx={{
        flex: "1 1 240px",
        minWidth: 0,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.default",
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, minWidth: 0, overflowWrap: "anywhere" }}>
          {campanha.nome}
        </Typography>
        <Chip
          label={rotuloDoStatus(campanha.status)}
          size="small"
          sx={{
            bgcolor: cores.bg,
            color: cores.color,
            fontWeight: 600,
            fontSize: "0.75rem",
            height: 22,
            flexShrink: 0,
          }}
        />
      </Stack>

      <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", mt: 0.5 }}>
        {textoDoValor(campanha.regraDoacao)}
      </Typography>

      {aprovada && (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mt: 0.5 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadRoundedIcon />}
            onClick={baixar}
            disabled={baixando}
          >
            Baixar selo
          </Button>
          {campanha.urlPublica && (
            <Button
              component="a"
              href={campanha.urlPublica}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="small"
              endIcon={<OpenInNewRoundedIcon />}
            >
              Ver página pública
            </Button>
          )}
        </Stack>
      )}

      {erroSelo && <ErrorMessage mensagem={erroSelo} sx={{ mt: 0.5 }} />}

      <Stack direction="row" sx={{ justifyContent: "flex-end", mt: "auto", pt: 0.25 }}>
        <Link
          href={`/campanhas/${encodeURIComponent(campanha.id)}`}
          aria-label={`Ver campanha ${campanha.nome}`}
          style={{ textDecoration: "none" }}
        >
          <Stack direction="row" spacing={0.25} sx={{ alignItems: "center", color: "text.secondary" }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Ver
            </Typography>
            <ArrowForwardRoundedIcon sx={{ fontSize: 13 }} aria-hidden="true" />
          </Stack>
        </Link>
      </Stack>
    </Box>
  );
}

export function NewCampaignCard() {
  return (
    <Box
      component={Link}
      href="/campanhas/nova"
      aria-label="Criar nova campanha"
      sx={{
        flex: "1 1 240px",
        minWidth: 0,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textDecoration: "none",
        gap: 0.5,
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        "&:hover": { borderColor: "primary.main", bgcolor: "primary.light" },
        cursor: "pointer",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary", textAlign: "center" }}>
        Criar nova campanha
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
        Leva cerca de 5 minutos
      </Typography>
    </Box>
  );
}

function SemCampanhas() {
  return (
    <Box sx={{ py: 6, textAlign: "center" }}>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Você ainda não tem campanhas.
      </Typography>
      <Button component={Link} href="/campanhas/nova" variant="contained" startIcon={<AddRoundedIcon />}>
        Criar campanha
      </Button>
    </Box>
  );
}

type Carregamento =
  | { estado: "carregando" }
  | { estado: "erro"; erro: unknown }
  | { estado: "carregada"; campanhas: CampanhaResumo[] };

// Lista as campanhas da empresa logada, da mais recente para a mais antiga.
// Com `limite`, mostra só as primeiras (dashboard).
export function ListaDeCampanhas({ limite }: { limite?: number }) {
  const [carregamento, setCarregamento] = useState<Carregamento>({ estado: "carregando" });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    listarCampanhas()
      .then((campanhas) => {
        if (ativo) setCarregamento({ estado: "carregada", campanhas });
      })
      .catch((erro: unknown) => {
        if (ativo) setCarregamento({ estado: "erro", erro });
      });
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const tentarNovamente = useCallback(() => {
    setCarregamento({ estado: "carregando" });
    setTentativa((t) => t + 1);
  }, []);

  const campanhas = carregamento.estado === "carregada" ? carregamento.campanhas : [];
  const visiveis = limite === undefined ? campanhas : campanhas.slice(0, limite);

  return (
    <AsyncState
      loading={carregamento.estado === "carregando"}
      erro={carregamento.estado === "erro" ? carregamento.erro : undefined}
      onRetry={tentarNovamente}
    >
      {visiveis.length === 0 ? (
        <SemCampanhas />
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {visiveis.map((campanha) => (
            <CampaignCard key={campanha.id} campanha={campanha} />
          ))}
          <NewCampaignCard />
        </Box>
      )}
    </AsyncState>
  );
}
