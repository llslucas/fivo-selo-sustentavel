import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Grid from "@mui/material/Grid";
import Link from "next/link";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

type AvatarColor = "mint" | "peach" | "lavender";

const companies: {
  initials: string;
  color: AvatarColor;
  name: string;
  location: string;
  tags: string;
  amount: string;
}[] = [
  {
    initials: "SV",
    color: "mint",
    name: "Café Serra Verde",
    location: "São João da Boa Vista, SP",
    tags: "Café que alimenta · Casa do Bem",
    amount: "R$ 6.800 doados",
  },
  {
    initials: "PA",
    color: "peach",
    name: "Padaria Aurora",
    location: "Campinas, SP",
    tags: "Pão do bem · Lar São Vicente",
    amount: "R$ 2.140 doados",
  },
  {
    initials: "VN",
    color: "lavender",
    name: "Vinhos Nogueira",
    location: "Poços de Caldas, MG",
    tags: "Safra solidária · APAE regional",
    amount: "R$ 4.390 doados",
  },
];

export default function PartnerCompanies() {
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
          <Link href="#" style={{ color: "inherit", textDecoration: "none" }}>
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

        <Grid container spacing={3}>
          {companies.map((company) => (
            <Grid key={company.name} size={{ xs: 12, sm: 6, md: 4 }}>
              <Link
                href="#"
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
                      "& .company-avatar": { transform: "scale(1.08)" },
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ mb: 2, alignItems: "center" }}>
                    <Box
                      className="company-avatar"
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        bgcolor: `var(--color-avatar-${company.color}-bg)`,
                        color: `var(--color-avatar-${company.color}-text)`,
                        transition: "transform 0.2s ease",
                      }}
                    >
                      {company.initials}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                        {company.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {company.location}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {company.tags}
                  </Typography>

                  <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700 }}>
                    {company.amount}
                  </Typography>
                </Box>
              </Link>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
