"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Link from "next/link";
import MuiLink from "@mui/material/Link";
import PublicSimpleHeader from "@/components/layout/PublicSimpleHeader";
import Footer from "@/components/layout/Footer";
import AsyncState from "@/components/ui/AsyncState";
import { textoDoValor } from "@/lib/campanhas/formatacao";
import { APP_ROUTES } from "@/lib/routes";
import { ApiError } from "@/services/api";
import {
  buscarEmpresaPublica,
  urlDoLogo,
  type EmpresaPublica,
} from "@/services/empresasPublicas";

const AVISO_FIVO_LAB =
  "A Fivo Lab não intermedeia as doações. A doação é responsabilidade da empresa participante.";

function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

function periodo(vigencia: { inicio: string; fim?: string }): string {
  const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");
  return vigencia.fim
    ? `${fmt(vigencia.inicio)} até ${fmt(vigencia.fim)}`
    : `A partir de ${fmt(vigencia.inicio)}`;
}

interface Props {
  slug: string;
  slugCampanha?: string;
}

export default function PaginaEmpresaPublica({ slug, slugCampanha }: Props) {
  const [empresa, setEmpresa] = useState<EmpresaPublica | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<unknown>(null);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [logoQuebrou, setLogoQuebrou] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setEmpresa(await buscarEmpresaPublica(slug));
      setErro(null);
      setNaoEncontrada(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNaoEncontrada(true);
      } else {
        setErro(e);
      }
    } finally {
      setCarregando(false);
    }
  }, [slug]);

    useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial intencional, roda quando o slug muda
    void carregar();
  }, [carregar]);


  useEffect(() => {
    if (!empresa || !slugCampanha) return;
    document.getElementById(slugCampanha)?.scrollIntoView();
  }, [empresa, slugCampanha]);
    if (naoEncontrada) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PublicSimpleHeader />
        <Container maxWidth="md" sx={{ flexGrow: 1, py: 6, textAlign: "center" }}>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Empresa não encontrada
          </Typography>
          <MuiLink component={Link} href={APP_ROUTES.public.parceiros}>
            Ver parceiros
          </MuiLink>
        </Container>
        <Footer />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicSimpleHeader />
      <Container component="main" maxWidth="md" sx={{ flexGrow: 1, py: { xs: 3, md: 5 } }}>
        <AsyncState
          loading={carregando}
          erro={erro}
          onRetry={() => {
            setCarregando(true);
            void carregar();
          }}
        >
          {empresa && (
            <Stack spacing={4}>
              {/* Card da empresa */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center" }}>
                {empresa.temLogo && !logoQuebrou ? (
                  // eslint-disable-next-line @next/next/no-img-element -- logo vem da API pública, sem otimização do next/image
                  <img
                    src={urlDoLogo(empresa.slug)}
                    alt={`Logo de ${empresa.nomeFantasia}`}
                    width={72}
                    height={72}
                    style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    onError={() => setLogoQuebrou(true)}
                  />
                ) : (
                  <Box
                    aria-hidden
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "1.5rem",
                      flexShrink: 0,
                    }}
                  >
                    {iniciais(empresa.nomeFantasia)}
                  </Box>
                )}

                <Box>
                  <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
                    {empresa.nomeFantasia}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {empresa.cidade}/{empresa.uf}
                  </Typography>
                  {empresa.site && (
                    <MuiLink href={empresa.site} target="_blank" rel="noopener noreferrer">
                      {empresa.site}
                    </MuiLink>
                  )}
                </Box>
              </Stack>

                         {/* Campanhas */}
              {empresa.campanhas.length === 0 ? (
                <Typography color="text.secondary">
                  Nenhuma campanha publicada até o momento
                </Typography>
              ) : (
                <Stack component="section" spacing={3}>
                  {empresa.campanhas.map((campanha) => (
                    <Box
                      key={campanha.slug}
                      id={campanha.slug}
                      component="article"
                      sx={{ scrollMarginTop: 16, borderTop: "1px solid", borderColor: "divider", pt: 2 }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", flexWrap: "wrap", mb: 0.5 }}
                      >
                        <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
                          {campanha.nome}
                        </Typography>
                        {campanha.situacao === "NAO_INICIADA" && (
                          <Chip label="Campanha ainda não iniciada" size="small" color="warning" />
                        )}
                      </Stack>

                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {campanha.descricao}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Beneficiada: {campanha.beneficiada.nome}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {textoDoValor(campanha.regraDoacao)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Vigência: {periodo(campanha.vigencia)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}


              <Alert severity="info">{AVISO_FIVO_LAB}</Alert>
            </Stack>
          )}
        </AsyncState>
      </Container>
      <Footer />
    </Box>
  );
}

