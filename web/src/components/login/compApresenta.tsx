import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function CompApresenta() {
  return (
    <Box
      sx={{
        backgroundColor: "#116A4D", 
        color: "#ffffff",
        p: { xs: 4, md: 6 },
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        width: "50%"
      }}
    >
    
      <Box>
     
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 6 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              bgcolor: "#D98032",
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ color: "#fff", fontSize: 18 }}>🌱</Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Fivo
          </Typography>
        </Box>
        <Typography variant="h3" sx={{ fontWeight: 600, mb: 3, lineHeight: 1.2 }}>
          Cada produto vendido pode virar um impacto real.
        </Typography>

        <Typography variant="body1" sx={{ color: "#A8D5C2", maxWidth: "80%", lineHeight: 1.6 }}>
          Crie campanhas, gere seu selo e mostre ao consumidor exatamente para onde a doação foi.
        </Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 6, mt: 8 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            312
          </Typography>
          <Typography variant="body2" sx={{ color: "#A8D5C2" }}>
            empresas
          </Typography>
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            R$ 1,2M
          </Typography>
          <Typography variant="body2" sx={{ color: "#A8D5C2" }}>
            doados
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}