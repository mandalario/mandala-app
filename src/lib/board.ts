export const BOARD_TYPES = [
  "Longboard soft",
  "Longboard fibra",
  "Fun board",
  "Mid Length",
  "Evolution",
  "Shortboard",
] as const;

export type ParsedBoard = { type: string; size: string };

/** Separa tipo e tamanho gravados em `profiles.board_size`. */
export function parseBoardField(raw: string | null | undefined): ParsedBoard {
  const value = raw ?? "";
  for (const type of BOARD_TYPES) {
    if (value.startsWith(type)) {
      let size = value.slice(type.length).trim();
      if (size.startsWith("(") && size.endsWith(")")) {
        size = size.slice(1, -1).trim();
      } else if (size.startsWith("-")) {
        size = size.slice(1).trim();
      }
      return { type, size };
    }
  }
  return { type: "", size: value };
}

/** Formato usado no banco: `Tipo (tamanho)` ou só um dos dois. */
export function formatBoardField(type: string, size: string): string | null {
  const t = type.trim();
  const s = size.trim();
  if (t && s) return `${t} (${s})`;
  if (t) return t;
  if (s) return s;
  return null;
}
