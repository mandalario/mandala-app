import { z } from "zod";
import { isValidPhone, personNameRegex } from "@/lib/phone";

export type ValidationT = (key: string, vars?: Record<string, string | number>) => string;

const FIELD_I18N_KEYS: Record<string, string> = {
  full_name: "profile.fields.fullName",
  phone: "profile.fields.phone",
  age: "profile.fields.age",
  weight_kg: "profile.fields.weight",
  height_cm: "profile.fields.height",
  surf_level: "profile.fields.level",
  stance: "profile.fields.stance",
  can_swim: "profile.fields.canSwim",
  has_own_board: "profile.fields.ownBoard",
  board_size: "board.size",
  experience_notes: "profile.fields.notes",
  medical_conditions: "profile.fields.medical",
  emergency_contact_name: "profile.fields.emergencyName",
  emergency_contact_phone: "profile.fields.emergencyPhone",
};

export function createOnboardingProfileSchema(t: ValidationT) {
  return z.object({
    full_name: z
      .string({ required_error: t("validation.required"), invalid_type_error: t("validation.mustBeText") })
      .trim()
      .min(2, t("validation.minChars", { min: 2 }))
      .max(100, t("validation.maxChars", { max: 100 })),
    phone: z
      .string({ required_error: t("validation.required"), invalid_type_error: t("validation.mustBeText") })
      .trim()
      .min(1, t("validation.required"))
      .refine(isValidPhone, { message: t("validation.phoneInvalid") }),
    age: z.coerce
      .number({ required_error: t("validation.required"), invalid_type_error: t("validation.mustBeNumber") })
      .int(t("validation.mustBeInteger"))
      .min(5, t("validation.minAge", { min: 5 }))
      .max(99, t("validation.maxAge", { max: 99 })),
    weight_kg: z.coerce
      .number({ required_error: t("validation.required"), invalid_type_error: t("validation.mustBeNumber") })
      .min(20, t("validation.minWeight", { min: 20 }))
      .max(250, t("validation.maxWeight", { max: 250 })),
    height_cm: z.coerce
      .number({ required_error: t("validation.required"), invalid_type_error: t("validation.mustBeNumber") })
      .min(80, t("validation.minHeight", { min: 80 }))
      .max(230, t("validation.maxHeight", { max: 230 })),
    surf_level: z.enum(["iniciante", "intermediario", "avancado"], {
      errorMap: () => ({ message: t("validation.selectLevel") }),
    }),
    stance: z.enum(["regular", "goofy", "desconhecido"], {
      errorMap: () => ({ message: t("validation.selectStance") }),
    }),
    can_swim: z.boolean({
      required_error: t("validation.required"),
      invalid_type_error: t("validation.mustBeBoolean"),
    }),
    has_own_board: z.boolean({
      required_error: t("validation.required"),
      invalid_type_error: t("validation.mustBeBoolean"),
    }),
    board_size: z
      .string()
      .trim()
      .max(50, t("validation.maxChars", { max: 50 }))
      .optional()
      .or(z.literal("")),
    experience_notes: z
      .string()
      .trim()
      .max(500, t("validation.maxChars", { max: 500 }))
      .optional()
      .or(z.literal("")),
    medical_conditions: z
      .string()
      .trim()
      .max(500, t("validation.maxChars", { max: 500 }))
      .optional()
      .or(z.literal("")),
    emergency_contact_name: z
      .string({ required_error: t("validation.required"), invalid_type_error: t("validation.mustBeText") })
      .trim()
      .min(2, t("validation.minChars", { min: 2 }))
      .max(100, t("validation.maxChars", { max: 100 }))
      .regex(personNameRegex, t("validation.lettersOnly")),
    emergency_contact_phone: z
      .string({ required_error: t("validation.required"), invalid_type_error: t("validation.mustBeText") })
      .trim()
      .min(1, t("validation.required"))
      .refine(isValidPhone, { message: t("validation.phoneInvalid") }),
  });
}

export function fieldValidationError(t: ValidationT, fieldKey: string, message: string): string {
  const i18nKey = FIELD_I18N_KEYS[fieldKey];
  const fieldLabel = i18nKey ? t(i18nKey) : fieldKey;
  return t("validation.fieldError", { field: fieldLabel, message });
}

export function formatProfileValidationError(error: z.ZodError, t: ValidationT): string {
  const issue = error.issues[0];
  if (!issue) return t("validation.formCheck");
  const fieldKey = String(issue.path[0] ?? "");
  return fieldValidationError(t, fieldKey, issue.message);
}

export function formatAllProfileValidationErrors(error: z.ZodError, t: ValidationT): string {
  return error.issues
    .map((issue) => {
      const fieldKey = String(issue.path[0] ?? "");
      return fieldValidationError(t, fieldKey, issue.message);
    })
    .join(" · ");
}
