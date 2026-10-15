import CompLogin from "@/components/login/compLogin";
import CompApresenta from "@/components/login/compApresenta";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";

export default function LoginPage() {
  return (
    <Box
      component="section"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: { xs: "#ffffff", md: "#F7F6F2" },
      }}
    >
      <Container
        maxWidth="md"
        disableGutters
        sx={{
          px: { xs: 0, sm: 2, md: 3 },
          py: { xs: 0, sm: 3, md: 4 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "stretch",
            border: { xs: "none", md: "1px solid #E0E0E0" },
            borderRadius: { xs: 0, md: 3 },
            overflow: "hidden",
            boxShadow: { xs: "none", md: "0 4px 24px rgba(0, 0, 0, 0.06)" },
            bgcolor: "#ffffff",
            minHeight: { xs: "100vh", md: "auto" },
          }}
        >
          <CompApresenta />
          <CompLogin />
        </Box>
      </Container>
    </Box>
  );
}