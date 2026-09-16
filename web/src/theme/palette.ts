// Fonte única das cores do projeto. Alimenta o tema MUI (src/theme/index.ts)
// e tem espelho em CSS custom properties em src/app/globals.css.
export const palette = {
  brand: {
    primary: "#0F6E56",
    primaryLight: "#E1F5EE",
  },
  accent: {
    main: "#BA7517",
    dark: "#854F0B",
    light: "#FAEEDA",
  },
  text: {
    primary: "#1B1B19",
    secondary: "#5F5E5A",
    muted: "#8B8A84",
  },
  surface: {
    background: "#FFFFFF",
    subtle: "#F7F6F2",
    border: "#E4E2DB",
  },
  avatars: {
    mint: { bg: "#E1F5EE", text: "#0F6E56" },
    peach: { bg: "#FAECE7", text: "#993C1D" },
    lavender: { bg: "#EEEDFE", text: "#534AB7" },
  },
} as const;

export default palette;
