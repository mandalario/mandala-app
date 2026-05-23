import { BOARD_TYPES } from "@/lib/board";

/** Valor gravado no banco → chave em `board.types.*` */
export const BOARD_TYPE_I18N_KEYS: Record<(typeof BOARD_TYPES)[number], string> = {
  "Longboard soft": "longboardSoft",
  "Longboard fibra": "longboardFibra",
  "Fun board": "funBoard",
  "Mid Length": "midLength",
  "Evolution": "evolution",
  "Shortboard": "shortboard",
};

export function boardTypeLabel(value: string, t: (key: string) => string): string {
  const key = BOARD_TYPE_I18N_KEYS[value as (typeof BOARD_TYPES)[number]];
  return key ? t(`board.types.${key}`) : value;
}
