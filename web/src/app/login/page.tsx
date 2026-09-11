import CompLogin from "@/components/login/compLogin";
import CompApresenta from "@/components/login/compApresenta";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
export default function LoginPage() {
  return (
     <Box
        component="section"
        sx={{
          minHeight: "100vh",     
          display: "flex",          
          alignItems: "center",     
          justifyContent: "center", 
        }}
      >
        <Container maxWidth="md">
          <Stack
            spacing={2}
            sx={{ display: "flex", flexDirection: "row", alignItems: "stretch",border: 1, borderColor: "#E0E0E0", borderRadius: 2, overflow: "hidden" }}
          >
            <CompApresenta />
            <CompLogin />
          </Stack>
        </Container>
      </Box>
  );
}