// Helper de viewport responsivo para os testes do frontend (web/).
//
// jsdom não implementa `window.matchMedia` nativamente e não reavalia layout a
// partir de `innerWidth`/`innerHeight`. Este helper simula uma largura de
// viewport fixa (320 ou 1280) para que o MUI 9 reavalie seus breakpoints:
//   - ajusta `window.innerWidth`/`window.innerHeight`;
//   - instala um `matchMedia` controlado que resolve as media queries do MUI
//     (`min-width`/`max-width`) segundo a largura simulada;
//   - dispara o evento `resize` para que ouvintes reavaliem o estado.
//
// Permite verificar que os controles essenciais das áreas interativas críticas
// renderizam sem corte/sobreposição nas larguras 320px e 1280px
// (Requisitos 8.3, 8.4).
//
// Observação sobre limpeza: usa `vi.stubGlobal`, de modo que o `afterEach`
// global de `tests/setup.ts` (que chama `vi.unstubAllGlobals`) restaura
// `innerWidth`, `innerHeight` e `matchMedia` automaticamente após cada teste.

import { vi } from "vitest";

// Altura padrão de viewport quando não informada. Valor típico de uma janela
// de desktop; para 320px uma altura de celular também é razoável, mas um valor
// único mantém os testes previsíveis e o foco na largura (eixo testado).
const ALTURA_PADRAO = 768;

// Extrai um valor em pixels de uma feature de media query (ex.: "min-width").
// Retorna null quando a feature não está presente na query.
function extrairPx(query: string, feature: "min-width" | "max-width"): number | null {
  // Casa, por exemplo, "(min-width:600px)" ou "(min-width: 37.5em)" — aqui
  // tratamos px; valores em em são convertidos assumindo 16px por em, que é a
  // base usada pelo MUI para seus breakpoints.
  const regex = new RegExp(`${feature}\\s*:\\s*([\\d.]+)(px|em|rem)?`, "i");
  const match = regex.exec(query);
  if (!match) return null;

  const valor = Number.parseFloat(match[1]);
  if (Number.isNaN(valor)) return null;

  const unidade = (match[2] ?? "px").toLowerCase();
  if (unidade === "em" || unidade === "rem") {
    return valor * 16;
  }
  return valor;
}

// Decide se uma media query casa com a largura simulada, considerando apenas as
// features relevantes para os breakpoints do MUI (`min-width`/`max-width`).
// Uma query sem nenhuma dessas features é considerada correspondente (ex.:
// "all" ou "screen"), para não bloquear verificações que não dependem de largura.
function queryCorresponde(query: string, largura: number): boolean {
  const minWidth = extrairPx(query, "min-width");
  const maxWidth = extrairPx(query, "max-width");

  if (minWidth !== null && largura < minWidth) return false;
  if (maxWidth !== null && largura > maxWidth) return false;
  return true;
}

// Instala um `matchMedia` controlado que resolve as media queries segundo a
// largura simulada. A interface segue a `MediaQueryList` do DOM, cobrindo os
// membros que o MUI consulta (`matches`, `media`, add/remove listeners).
function instalarMatchMedia(largura: number): void {
  const matchMediaControlado = (query: string): MediaQueryList => {
    const matches = queryCorresponde(query, largura);

    const lista: MediaQueryList = {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      // APIs legadas, ainda consultadas por algumas versões/caminhos do MUI.
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };

    return lista;
  };

  vi.stubGlobal("matchMedia", matchMediaControlado);
}

/**
 * Ajusta a largura (e opcionalmente a altura) do viewport simulado para a
 * largura dada, instala um `matchMedia` controlado alinhado a essa largura e
 * dispara o evento `resize` para que o MUI reavalie seus breakpoints.
 *
 * @param largura Largura do viewport em pixels: 320 (mínima) ou 1280 (ampla).
 * @param altura  Altura opcional em pixels; usa um padrão quando omitida.
 */
export function definirViewport(largura: 320 | 1280, altura?: number): void {
  const alturaFinal = altura ?? ALTURA_PADRAO;

  // Ajusta as dimensões da janela simulada. `vi.stubGlobal` grava em
  // `globalThis`/`window` (mesmo objeto no jsdom) e é desfeito por
  // `vi.unstubAllGlobals` no afterEach global.
  vi.stubGlobal("innerWidth", largura);
  vi.stubGlobal("innerHeight", alturaFinal);

  // Instala o matchMedia controlado para a largura simulada.
  instalarMatchMedia(largura);

  // Notifica ouvintes (inclusive o MUI) de que o viewport mudou.
  window.dispatchEvent(new Event("resize"));
}
