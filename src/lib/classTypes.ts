export type ClassType = "avulsa_grupo" | "avulsa_particular" | "aluguel";

export const SLOT_TYPE_COLORS: Record<ClassType, string> = {
  avulsa_grupo: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  avulsa_particular: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  aluguel: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export const SCHEDULE_TYPE_I18N: Record<ClassType, string> = {
  avulsa_grupo: "schedule.classTypes.group",
  avulsa_particular: "schedule.classTypes.private",
  aluguel: "schedule.classTypes.rental",
};

export const PACKAGE_TYPE_I18N: Record<ClassType, string> = {
  avulsa_grupo: "packages.typeGroup",
  avulsa_particular: "packages.typePrivate",
  aluguel: "packages.typeRental",
};

export const ADMIN_TYPE_LABELS: Record<ClassType, string> = {
  avulsa_grupo: "Grupo",
  avulsa_particular: "Particular",
  aluguel: "Aluguel",
};

export const CREDIT_FIELD: Record<ClassType, "credits_grupo" | "credits_particular" | "credits_aluguel"> = {
  avulsa_grupo: "credits_grupo",
  avulsa_particular: "credits_particular",
  aluguel: "credits_aluguel",
};

export const CREDIT_TYPE_LONG_I18N: Record<ClassType, string> = {
  avulsa_grupo: "schedule.classTypes.groupLong",
  avulsa_particular: "schedule.classTypes.privateLong",
  aluguel: "schedule.classTypes.rental",
};

export function resolveClassType(type: string | null | undefined): ClassType {
  if (type && type in SLOT_TYPE_COLORS) return type as ClassType;
  return "avulsa_grupo";
}
