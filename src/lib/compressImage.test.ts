import { describe, expect, it } from "vitest";
import { isLikelyImageFile } from "./compressImage";

describe("isLikelyImageFile", () => {
  it("accepts image mime types", () => {
    expect(isLikelyImageFile(new File([], "x", { type: "image/jpeg" }))).toBe(true);
  });

  it("accepts common extensions when mime is empty", () => {
    expect(isLikelyImageFile(new File([], "photo.JPG", { type: "" }))).toBe(true);
    expect(isLikelyImageFile(new File([], "photo.png", { type: "" }))).toBe(true);
  });

  it("rejects non-images", () => {
    expect(isLikelyImageFile(new File([], "doc.pdf", { type: "application/pdf" }))).toBe(false);
  });
});
