import { describe, it, expect } from "vitest";
import { isPublicRoute } from "@/lib/routes";

describe("isPublicRoute — rota pública do QR (T34)", () => {
  it("aceita /empresa/{slug}/{slugCampanha}", () => {
    expect(isPublicRoute("/empresa/cafe-serra-verde/agua-limpa")).toBe(true);
  });

  it("aceita /empresa/{slug}", () => {
    expect(isPublicRoute("/empresa/cafe-serra-verde")).toBe(true);
  });
});
