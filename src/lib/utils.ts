import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Remove vírgula e ponto (ex.: 1,75 → 175) para campos de altura em cm. */
export function stripDecimalSeparators(value: string) {
  return value.replace(/[.,]/g, "");
}
