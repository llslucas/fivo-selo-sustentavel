import { createTheme } from "@mui/material/styles";
import palette from "./palette";

// Tema base do projeto Selo Sustentável.
// As cores vêm de `./palette.ts` (fonte única) — mudar o tema visual do
// projeto começa por lá, não aqui.
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: palette.brand.primary,
      light: palette.brand.primaryLight,
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: palette.accent.main,
      dark: palette.accent.dark,
      light: palette.accent.light,
      contrastText: "#FFFFFF",
    },
    text: {
      primary: palette.text.primary,
      secondary: palette.text.secondary,
      disabled: palette.text.muted,
    },
    background: {
      default: palette.surface.background,
      paper: palette.surface.subtle,
    },
    divider: palette.surface.border,
  },
  typography: {
    fontFamily: "var(--font-roboto), Arial, Helvetica, sans-serif",
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          transition:
            "transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease, border-color 0.15s ease",
          "&:hover": {
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;
