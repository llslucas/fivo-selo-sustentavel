import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export default function AdminEmpresasPage() {
  return (
    <Box sx={{ maxWidth: 960, mx: "auto", px: 2, py: 4 }}>
      <Typography component="h1" variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Empresas em análise
      </Typography>
    </Box>
  );
}
