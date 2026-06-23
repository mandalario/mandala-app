export function isConfirmedSlot(notes: string | null | undefined): boolean {
  return notes?.includes("[CONFIRMADA]") ?? false;
}

export function isImprevistoSlot(notes: string | null | undefined): boolean {
  return notes?.includes("[IMPREVISTO]") ?? false;
}

export function getImprevistoReason(notes: string | null): string {
  if (!notes) return "";
  const match = notes.match(/\[IMPREVISTO\]\s*([^[\]-]*)/);
  return match ? match[1].trim() : "";
}

export function cleanSlotNotes(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes
    .replace(/\[CONFIRMADA\]\s*/g, "")
    .replace(/\[IMPREVISTO\]\s*([^[\]-]*)\s*(-|—)?\s*/g, "")
    .trim();
}
