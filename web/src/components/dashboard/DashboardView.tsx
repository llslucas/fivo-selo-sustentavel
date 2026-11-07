"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { ListaDeCampanhas } from "@/components/dashboard/CampaignCard";
import { useAuth } from "@/hooks/useAuth";

const CAMPANHAS_RECENTES = 3;

export default function DashboardView() {
  const { empresa } = useAuth();
  const nomeEmpresa = empresa?.nomeFantasia || empresa?.razaoSocial || "";

  return (
    <Box sx={{ bgcolor: "background.paper", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={4}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "flex-start" } }}
          >
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                {nomeEmpresa ? `Olá, ${nomeEmpresa}` : "Olá"}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Aqui, está um resumo das suas campanhas de impacto social.
              </Typography>
            </Box>
            <Button
              component={Link}
              href="/campanhas/nova"
              variant="contained"
              startIcon={<AddRoundedIcon />}
              sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", sm: "auto" } }}
            >
              Nova campanha
            </Button>
          </Stack>

          <Box>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}
            >
              <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
                Campanhas recentes
              </Typography>
              <Link
                href="/campanhas"
                aria-label="Ver todas as campanhas"
                style={{ textDecoration: "none" }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: "primary.main",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Ver todas →
                </Typography>
              </Link>
            </Stack>

            <ListaDeCampanhas limite={CAMPANHAS_RECENTES} />
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
