import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Configuração do runner de testes do frontend (web/).
// - Ambiente jsdom para montar componentes React 19 / MUI 9 (Requisito 1.2).
// - globals: true habilita describe/it/expect/vi sem import explícito (Requisito 1.3).
// - setupFiles roda o bootstrap global antes de cada arquivo de teste.
//   Observação: ./tests/setup.ts é criado em uma task posterior (2.1); apenas referenciado aqui.
// - Alias "@/*" alinhado ao tsconfig.json do projeto para resolução de módulos ESM/TS.
// - passWithNoTests: false (padrão) garante exit code != 0 quando nenhum teste é encontrado (Requisito 1.6).
//   Exit code 0 em sucesso e != 0 em falha são comportamentos padrão de `vitest run` (Requisitos 1.4, 1.5).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: false,
  },
});
