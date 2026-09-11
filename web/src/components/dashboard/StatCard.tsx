import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps } from "@mui/material/styles";

type StatCardProps = {
  value: string;
  label: string;
  sx?: SxProps;
};

export function StatCard({ value, label, sx }: StatCardProps) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.default",
        p: 2.5,
        ...sx,
      }}
    >
      <Typography variant="h4" component="p" sx={{ fontWeight: 700, mb: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
