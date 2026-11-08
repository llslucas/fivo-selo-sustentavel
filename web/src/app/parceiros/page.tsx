"use client";

import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";
import PublicSimpleHeader from "@/components/layout/PublicSimpleHeader";
import Footer from "@/components/layout/Footer";
import { mensagemDeErro } from "@/services/api";
import {
  listarParceiros,
  urlDoLogo,
  type ParceiroResumo,
} from "@/services/empresasPublicas";
import { APP_ROUTES } from "@/lib/routes";

// Minúsculas e sem acento, para a busca não diferenciar "água" de "Agua".
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function iniciaisDe(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

function Logo({ empresa }: { empresa: ParceiroResumo }) {
  const [falhou, setFalhou] = useState(false);
  const caixa = {
    width: 48,
    height: 48,
    borderRadius: "50%",
    flexShrink: 0,
    overflow: "hidden",
  } as const;

  if (empresa.temLogo && !falhou) {
    return (
      <Box sx={caixa}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlDoLogo(empresa.slug)}
          alt={`Logo de ${empresa.nomeFantasia}`}
          width={48}
          height={48}
          style={{ objectFit: "cover", display: "block" }}
          onError={() => setFalhou(true)}
        />
      </Box>
    );
  }

  return (
    <Box
      aria-hidden="true"
      data-testid="iniciais-logo"
      sx={{
        ...caixa,
        bgcolor: "#0F6E56",
        color: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "1rem",
      }}
    >
      {iniciaisDe(empresa.nomeFantasia)}
    </Box>
  );
}

export default function ParceirosPage() {
  const [busca, setBusca] = useState("");
  const [parceiros, setParceiros] = useState<ParceiroResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    listarParceiros()
      .then((lista) => {
        if (ativo) setParceiros(lista);
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e));
      });
    return () => {
      ativo = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim());
    return (parceiros ?? []).filter(
      (p) =>
        normalizar(p.nomeFantasia).includes(termo) ||
        normalizar(p.cidade).includes(termo) ||
        normalizar(p.uf).includes(termo),
    );
  }, [parceiros, busca]);

  const total = parceiros?.length ?? 0;

  return (
    <Box sx={{ bgcolor: "#FFFFFF", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicSimpleHeader />

      <Box component="main" sx={{ flexGrow: 1, py: { xs: 4, md: 6 } }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: "#1B1B19", mb: 1 }}>
              Empresas parceiras
            </Typography>
            <Typography variant="body1" sx={{ color: "#5F5E5A" }}>
              Conheça as empresas que estão gerando impacto social através da Fivo.
            </Typography>
          </Box>

          {erro && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {erro}
            </Alert>
          )}

          {!erro && parceiros === null && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress aria-label="Carregando empresas" />
            </Box>
          )}

          {parceiros !== null && total === 0 && (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="body1" sx={{ color: "#5F5E5A", mb: 2 }}>
                Nenhuma empresa parceira ainda.
              </Typography>
              <Button component={Link} href={APP_ROUTES.public.cadastro} variant="outlined">
                Cadastrar minha empresa
              </Button>
            </Box>
          )}

          {parceiros !== null && total > 0 && (
            <>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                sx={{
                  justifyContent: "space-between",
                  alignItems: { xs: "stretch", sm: "center" },
                  mb: 4,
                  gap: 2,
                }}
              >
                <TextField
                  size="small"
                  placeholder="Buscar empresa..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  slotProps={{ htmlInput: { "aria-label": "Buscar empresa" } }}
                  sx={{
                    maxWidth: { sm: 300 },
                    "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#FFFFFF" },
                  }}
                />
                <Typography variant="body2" sx={{ color: "#5F5E5A", textAlign: { xs: "left", sm: "right" } }}>
                  {total === 1 ? "1 empresa cadastrada" : `${total} empresas cadastradas`}
                </Typography>
              </Stack>

              <Grid container spacing={3}>
                {filtrados.map((empresa) => (
                  <Grid key={empresa.slug} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box
                      sx={{
                        border: "1px solid #E5E7EB",
                        borderRadius: 3,
                        p: 3,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 3,
                        bgcolor: "#FFFFFF",
                        transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
                        "&:hover": {
                          borderColor: "#0F6E56",
                          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                          transform: "translateY(-2px)",
                        },
                      }}
                    >
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center", minWidth: 0 }}>
                        <Logo empresa={empresa} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700, color: "#1B1B19", lineHeight: 1.25, overflowWrap: "anywhere" }}
                          >
                            {empresa.nomeFantasia}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#71717A" }}>
                            {`${empresa.cidade}/${empresa.uf}`}
                          </Typography>
                        </Box>
                      </Stack>

                      <Button
                        component={Link}
                        href={`/empresa/${encodeURIComponent(empresa.slug)}`}
                        variant="outlined"
                        fullWidth
                        aria-label={`Ver perfil de ${empresa.nomeFantasia}`}
                        sx={{
                          borderColor: "#E5E7EB",
                          color: "#1B1B19",
                          borderRadius: 2,
                          py: 1,
                          textTransform: "none",
                          fontWeight: 600,
                          "&:hover": { borderColor: "#0F6E56", color: "#0F6E56", bgcolor: "#F4FAF7" },
                        }}
                      >
                        Ver perfil
                      </Button>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}