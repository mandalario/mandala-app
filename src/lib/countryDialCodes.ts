export type CountryDialCode = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
};

function flag(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/** Países mais usados no app; Brasil primeiro, depois ordem alfabética. */
export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { iso: "BR", name: "Brasil", dial: "55", flag: flag("BR") },
  { iso: "AR", name: "Argentina", dial: "54", flag: flag("AR") },
  { iso: "AU", name: "Austrália", dial: "61", flag: flag("AU") },
  { iso: "AT", name: "Áustria", dial: "43", flag: flag("AT") },
  { iso: "BE", name: "Bélgica", dial: "32", flag: flag("BE") },
  { iso: "BO", name: "Bolívia", dial: "591", flag: flag("BO") },
  { iso: "CA", name: "Canadá", dial: "1", flag: flag("CA") },
  { iso: "CL", name: "Chile", dial: "56", flag: flag("CL") },
  { iso: "CN", name: "China", dial: "86", flag: flag("CN") },
  { iso: "CO", name: "Colômbia", dial: "57", flag: flag("CO") },
  { iso: "KR", name: "Coreia do Sul", dial: "82", flag: flag("KR") },
  { iso: "CR", name: "Costa Rica", dial: "506", flag: flag("CR") },
  { iso: "CU", name: "Cuba", dial: "53", flag: flag("CU") },
  { iso: "AE", name: "Emirados Árabes", dial: "971", flag: flag("AE") },
  { iso: "EC", name: "Equador", dial: "593", flag: flag("EC") },
  { iso: "ES", name: "Espanha", dial: "34", flag: flag("ES") },
  { iso: "US", name: "Estados Unidos", dial: "1", flag: flag("US") },
  { iso: "FR", name: "França", dial: "33", flag: flag("FR") },
  { iso: "NL", name: "Holanda", dial: "31", flag: flag("NL") },
  { iso: "IN", name: "Índia", dial: "91", flag: flag("IN") },
  { iso: "IE", name: "Irlanda", dial: "353", flag: flag("IE") },
  { iso: "IL", name: "Israel", dial: "972", flag: flag("IL") },
  { iso: "IT", name: "Itália", dial: "39", flag: flag("IT") },
  { iso: "JP", name: "Japão", dial: "81", flag: flag("JP") },
  { iso: "MX", name: "México", dial: "52", flag: flag("MX") },
  { iso: "MZ", name: "Moçambique", dial: "258", flag: flag("MZ") },
  { iso: "NO", name: "Noruega", dial: "47", flag: flag("NO") },
  { iso: "PY", name: "Paraguai", dial: "595", flag: flag("PY") },
  { iso: "PE", name: "Peru", dial: "51", flag: flag("PE") },
  { iso: "PT", name: "Portugal", dial: "351", flag: flag("PT") },
  { iso: "GB", name: "Reino Unido", dial: "44", flag: flag("GB") },
  { iso: "DO", name: "Rep. Dominicana", dial: "1", flag: flag("DO") },
  { iso: "ZA", name: "África do Sul", dial: "27", flag: flag("ZA") },
  { iso: "CH", name: "Suíça", dial: "41", flag: flag("CH") },
  { iso: "SE", name: "Suécia", dial: "46", flag: flag("SE") },
  { iso: "DE", name: "Alemanha", dial: "49", flag: flag("DE") },
  { iso: "UY", name: "Uruguai", dial: "598", flag: flag("UY") },
  { iso: "VE", name: "Venezuela", dial: "58", flag: flag("VE") },
];

export const DEFAULT_COUNTRY_ISO = "BR";

export const COUNTRY_DIAL_BY_ISO = new Map(COUNTRY_DIAL_CODES.map((c) => [c.iso, c]));

/** Maior código primeiro para parse correto (ex.: 351 antes de 35). */
export const COUNTRY_DIAL_CODES_BY_LENGTH = [...COUNTRY_DIAL_CODES].sort(
  (a, b) => b.dial.length - a.dial.length,
);

export function getCountryByIso(iso: string): CountryDialCode | undefined {
  return COUNTRY_DIAL_BY_ISO.get(iso);
}

export function getDefaultCountry(): CountryDialCode {
  return COUNTRY_DIAL_BY_ISO.get(DEFAULT_COUNTRY_ISO)!;
}
