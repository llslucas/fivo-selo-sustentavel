"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { APP_ROUTES } from "@/lib/routes";
import { mensagemDeErro } from "@/services/api";
import {
  listarParceiros,
  urlDoLogo,
  type ParceiroResumo,
} from "@/services/empresasPublicas";

const QUANTIDADE_NA_HOME = 3;

function iniciaisDe(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

function Avatar({ empresa }: { empresa: ParceiroResumo }) {
  const [falhou, setFalhou] = useState(false);

  if (empresa.temLogo && !falhou) {
    return (
      <Box sx={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={urlDoLogo(empresa.slug)}
          alt={`Logo de ${empresa.nomeFantasia}`}
          width={36}
          height={36}
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
        width: 36,
        height: 36,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.75rem",
        fontWeight: 700,
        bgcolor: "var(--color-avatar-mint-bg)",
        color: "var(--color-avatar-mint-text)",
      }}
    >
      {iniciaisDe(empresa.nomeFantasia)}
    </Box>
  );
}

export default function PartnerCompanies() {
  const [parceiros, setParceiros] = useState<ParceiroResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    listarParceiros()
      .then((lista) => {
        if (ativo) setParceiros(lista.slice(0, QUANTIDADE_NA_HOME));
      })
      .catch((e: unknown) => {
        if (ativo) setErro(mensagemDeErro(e));
      });
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <Box id="empresas-parceiras" component="section" sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 10 } }}>
        <Stack
          direction="row"
          sx={{ mb: 1, alignItems: "flex-start", justifyContent: "space-between" }}
        >
          <Typography variant="h4" component="h2" sx={{ fontWeight: 700 }}>
            Empresas que já participam
          </Typography>
          <Link href={APP_ROUTES.public.parceiros} style={{ color: "inherit", textDecoration: "none" }}>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                alignItems: "center",
                color: "primary.main",
                "&:hover .ver-todas-arrow": { transform: "translateX(3px)" },
              }}
            >
              <Typography
                variant="body2"
                sx={{ whiteSpace: "nowrap", "&:hover": { textDecoration: "underline" } }}
              >
                Ver todas
              </Typography>
              <ArrowForwardRoundedIcon
                className="ver-todas-arrow"
                sx={{ fontSize: 16, transition: "transform 0.2s ease" }}
              />
            </Stack>
          </Link>
        </Stack>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
          Veja campanhas em andamento e o que já foi doado.
        </Typography>

        {erro && <Alert severity="error">{erro}</Alert>}

        {parceiros !== null && parceiros.length === 0 && (
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Nenhuma empresa parceira ainda.
            </Typography>
            <Button component={Link} href={APP_ROUTES.public.cadastro} variant="outlined">
              Cadastrar minha empresa
            </Button>
          </Box>
        )}

        {parceiros !== null && parceiros.length > 0 && (
          <Grid container spacing={3}>
            {parceiros.map((empresa) => (
              <Grid key={empresa.slug} size={{ xs: 12, sm: 6, md: 4 }}>
                <Link
                  href={`/empresa/${encodeURIComponent(empresa.slug)}`}
                  style={{ color: "inherit", textDecoration: "none", display: "block", height: "100%" }}
                >
                  <Box
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 3,
                      p: 3,
                      height: "100%",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        boxShadow: 2,
                        transform: "translateY(-3px)",
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                      <Avatar empresa={empresa} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600, lineHeight: 1.3, overflowWrap: "anywhere" }}
                        >
                          {empresa.nomeFantasia}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {`${empresa.cidade}/${empresa.uf}`}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Link>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}