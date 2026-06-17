import { describe, expect, it } from "vitest";
import { resolveStudentContent, translateStudentContent } from "./studentContent";

const STRETCH_PT = "Alongar antes da sessão ajuda no desempenho e reduz o risco de lesões.";
const TRASH_PT = "Surfistas conscientes levam seu lixo embora e ajudam a manter a praia limpa";

describe("resolveStudentContent quotes", () => {
  it("traduz via mapa estático para EN", () => {
    expect(resolveStudentContent("quotes", STRETCH_PT, "en")).toContain("Stretching");
  });

  it("traduz via mapa estático para ES", () => {
    expect(resolveStudentContent("quotes", STRETCH_PT, "es")).toContain("Estirar");
  });

  it("ignora text_en quando igual ao PT e usa o mapa", () => {
    expect(
      resolveStudentContent("quotes", STRETCH_PT, "en", { en: STRETCH_PT, es: null }),
    ).toContain("Stretching");
  });

  it("usa text_en do banco quando distinto do PT", () => {
    expect(
      resolveStudentContent("quotes", "Frase customizada.", "en", {
        en: "Custom quote.",
        es: null,
      }),
    ).toBe("Custom quote.");
  });

  it("mantém PT quando idioma é pt", () => {
    expect(resolveStudentContent("quotes", STRETCH_PT, "pt")).toBe(STRETCH_PT);
  });

  it("traduz frase do lixo na praia para EN", () => {
    expect(resolveStudentContent("quotes", TRASH_PT, "en")).toContain("Conscious surfers");
  });

  it("traduz frase do lixo na praia para ES", () => {
    expect(resolveStudentContent("quotes", `${TRASH_PT}.`, "es")).toContain("surfistas conscientes");
  });
});

describe("translateStudentContent", () => {
  it("retorna o texto original em PT", () => {
    expect(translateStudentContent("quotes", STRETCH_PT, "pt")).toBe(STRETCH_PT);
  });
});
