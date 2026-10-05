import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function CompApresenta() {
  return (
    <Box
      sx={{
        backgroundColor: "#116A4D",
        color: "#ffffff",
        p: { xs: 3.5, sm: 4, md: 6 },
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: { xs: "100%", md: "50%" },
        flexShrink: 0,
      }}
    >
      <Box>
        {/* Header com Logo */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: { xs: 3, md: 5 } }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              bgcolor: "rgba(255, 255, 255, 0.12)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6ee7b7",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21v-7" />
              <path d="M12 14C8.5 14 5 11 5 7a7 7 0 0 1 7 7Z" />
              <path d="M12 14c3.5 0 7-3 7-7a7 7 0 0 0-7 7Z" />
            </svg>
          </Box>
          <Typography
            sx={{
              color: "#ffffff",
              fontSize: "1.25rem",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            fivo
          </Typography>
        </Box>

        {/* Título de impacto */}
        <Typography
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: { xs: "1.45rem", sm: "1.75rem", md: "2.1rem" },
            lineHeight: 1.22,
            mb: { xs: 1.5, md: 2.5 },
            letterSpacing: "-0.02em",
          }}
        >
          Cada produto vendido pode virar um impacto real.
        </Typography>

        {/* Descrição */}
        <Typography
          variant="body1"
          sx={{
            color: "#A8D5C2",
            fontSize: { xs: "0.925rem", md: "1rem" },
            lineHeight: 1.55,
            maxWidth: { xs: "100%", md: "90%" },
          }}
        >
          Crie campanhas, gere seu selo e mostre ao consumidor exatamente para onde a doação foi.
        </Typography>
      </Box>

      {/* Estatísticas */}
      <Box sx={{ display: "flex", gap: { xs: 4, sm: 6 }, mt: { xs: 3.5, md: 6 } }}>
        <Box>
          <Typography
            sx={{
              fontSize: { xs: "1.5rem", md: "1.85rem" },
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            312
          </Typography>
          <Typography variant="body2" sx={{ color: "#A8D5C2", mt: 0.25 }}>
            empresas
          </Typography>
        </Box>
        <Box>
          <Typography
            sx={{
              fontSize: { xs: "1.5rem", md: "1.85rem" },
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            R$ 1,2M
          </Typography>
          <Typography variant="body2" sx={{ color: "#A8D5C2", mt: 0.25 }}>
            doados
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}