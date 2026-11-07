"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { ListaDeCampanhas } from "@/components/dashboard/CampaignCard";

export default function CampanhasPage() {
  return (
    <Box sx={{ bgcolor: "background.paper", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={4}>
          {/* Cabeçalho da página */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", sm: "flex-start" } }}
          >
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Todas as Campanhas
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Acompanhe suas campanhas e baixe o selo das aprovadas.
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

          {/* Cards de campanha */}
          <ListaDeCampanhas />
        </Stack>
      </Container>
    </Box>
  );
}
