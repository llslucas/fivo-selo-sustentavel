import type { Metadata } from "next";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import VolunteerActivismRoundedIcon from "@mui/icons-material/VolunteerActivismRounded";
import { APP_ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Painel do admin · Fivo",
};

const atalhos = [
  {
    titulo: "Instituições em análise",
    descricao: "Aprovar ou recusar os cadastros de instituições.",
    href: APP_ROUTES.admin.instituicoes,
    Icone: ApartmentRoundedIcon,
  },
  {
    titulo: "Empresas em análise",
    descricao: "Aprovar ou recusar os cadastros de empresas.",
    href: APP_ROUTES.admin.empresas,
    Icone: BusinessCenterRoundedIcon,
  },
  {
    titulo: "Causas",
    descricao: "Gerenciar as causas que as instituições podem escolher.",
    href: APP_ROUTES.admin.causas,
    Icone: VolunteerActivismRoundedIcon,
  },
];

export default function AdminPage() {
  return (
    <Box sx={{ maxWidth: 960, mx: "auto", px: 2, py: 4 }}>
      <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Painel do admin
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {atalhos.map(({ titulo, descricao, href, Icone }) => (
          <Link key={href} href={href} style={{ color: "inherit", textDecoration: "none" }}>
            <Box
              sx={{
                height: "100%",
                p: 2.5,
                borderRadius: 3,
                border: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                },
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 40,
                  height: 40,
                  mb: 1.5,
                  borderRadius: "10px",
                  bgcolor: "primary.light",
                  color: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icone sx={{ fontSize: 22 }} />
              </Box>
              <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                {titulo}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {descricao}
              </Typography>
            </Box>
          </Link>
        ))}
      </Box>
    </Box>
  );
}
