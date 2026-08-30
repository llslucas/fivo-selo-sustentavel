/**
 * Paleta de cores do projeto Selo Sustentável (Fivo).
 *
 * Fonte única da verdade: para mudar uma cor do projeto, mude aqui.
 * Esses valores alimentam o tema do MUI (`src/theme/index.ts`) e têm um
 * espelho em CSS custom properties em `src/app/globals.css` (bloco
 * `:root`) — ao alterar um valor aqui, replique a mudança lá também.
 *
 * Extraída das telas de referência em DOC/screens.
 */
export const palette = {
  brand: {
    // Verde principal — botões primários, header, links de destaque.
    primary: "#0F6E56",
    // Tom claro do verde — fundo de badges, ícones e chips.
    primaryLight: "#E1F5EE",
  },
  accent: {
    // Âmbar — usado em detalhes e no ícone de "comprovante".
    main: "#BA7517",
    // Âmbar mais escuro — contraste sobre o fundo claro (glifo de ícone).
    dark: "#854F0B",
    // Tom claro do âmbar — fundo de ícones/chips de destaque.
    light: "#FAEEDA",
  },
  text: {
    primary: "#1B1B19", // títulos e texto forte
    secondary: "#5F5E5A", // parágrafos e descrições
    muted: "#8B8A84", // legendas, placeholders, rodapé
  },
  surface: {
    background: "#FFFFFF", // fundo geral da página
    subtle: "#F7F6F2", // painéis, cards e inputs levemente destacados
    border: "#E4E2DB", // bordas e divisórias
  },
  // Cores decorativas para avatares/iniciais de empresas parceiras.
  // Sem equivalente direto no palette do MUI — usadas via CSS var direto.
  avatars: {
    mint: { bg: "#E1F5EE", text: "#0F6E56" },
    peach: { bg: "#FAECE7", text: "#993C1D" },
    lavender: { bg: "#EEEDFE", text: "#534AB7" },
  },
} as const;

export default palette;
