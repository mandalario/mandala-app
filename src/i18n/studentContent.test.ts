import { describe, expect, it } from "vitest";
import { DAILY_QUOTE_TRANSLATIONS } from "./dailyQuoteCatalog";
import {
  mergeQuoteTranslationsForSave,
  quoteHasTranslations,
  resolveStudentContent,
  translateStudentContent,
} from "./studentContent";

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

describe("catálogo completo de frases do dia", () => {
  for (const [pt, { en, es }] of Object.entries(DAILY_QUOTE_TRANSLATIONS)) {
    it(`traduz para EN: ${pt.slice(0, 40)}…`, () => {
      expect(resolveStudentContent("quotes", pt, "en")).toBe(en);
    });
    it(`traduz para ES: ${pt.slice(0, 40)}…`, () => {
      expect(resolveStudentContent("quotes", pt, "es")).toBe(es);
    });
  }
});

describe("mergeQuoteTranslationsForSave", () => {
  it("usa catálogo quando campos do admin estão vazios", () => {
    expect(mergeQuoteTranslationsForSave(STRETCH_PT, { en: null, es: null })?.en).toContain("Stretching");
  });

  it("retorna null quando não há tradução", () => {
    expect(mergeQuoteTranslationsForSave("Frase totalmente nova.", { en: null, es: null })).toBeNull();
  });

  it("prioriza campos do admin sobre catálogo", () => {
    expect(
      mergeQuoteTranslationsForSave(STRETCH_PT, { en: "Custom EN.", es: "Custom ES." }),
    ).toEqual({ en: "Custom EN.", es: "Custom ES." });
  });
});

describe("quoteHasTranslations", () => {
  it("retorna true para frase do catálogo sem colunas no banco", () => {
    expect(quoteHasTranslations(STRETCH_PT)).toBe(true);
  });

  it("retorna true quando banco tem EN/ES distintos do PT", () => {
    expect(
      quoteHasTranslations("Nova frase.", { en: "New quote.", es: "Nueva frase." }),
    ).toBe(true);
  });

  it("retorna false quando traduções faltam", () => {
    expect(quoteHasTranslations("Nova frase.", { en: null, es: null })).toBe(false);
  });
});
