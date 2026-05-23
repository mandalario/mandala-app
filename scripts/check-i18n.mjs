#!/usr/bin/env node
/**
 * Garante que pt.json, en.json e es.json tenham as mesmas chaves.
 * Rode: npm run i18n:check (também roda no build).
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, "../src/i18n/locales");
const langs = ["pt", "en", "es"];

function flatten(obj, prefix = "") {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      for (const p of flatten(v, path)) out.add(p);
    } else {
      out.add(path);
    }
  }
  return out;
}

const sets = {};
for (const lang of langs) {
  const raw = readFileSync(join(localesDir, `${lang}.json`), "utf8");
  sets[lang] = flatten(JSON.parse(raw));
}

const base = sets.pt;
let failed = false;

for (const lang of ["en", "es"]) {
  const missing = [...base].filter((k) => !sets[lang].has(k));
  const extra = [...sets[lang]].filter((k) => !base.has(k));
  if (missing.length) {
    failed = true;
    console.error(`\n[${lang}] faltam ${missing.length} chave(s) presentes em pt:`);
    missing.slice(0, 30).forEach((k) => console.error(`  - ${k}`));
    if (missing.length > 30) console.error(`  ... e mais ${missing.length - 30}`);
  }
  if (extra.length) {
    failed = true;
    console.error(`\n[${lang}] tem ${extra.length} chave(s) extras (não estão em pt):`);
    extra.slice(0, 30).forEach((k) => console.error(`  - ${k}`));
    if (extra.length > 30) console.error(`  ... e mais ${extra.length - 30}`);
  }
}

if (failed) {
  console.error("\nCorrija os arquivos em src/i18n/locales/ antes de continuar.\n");
  process.exit(1);
}

console.log(`i18n OK: ${base.size} chaves sincronizadas em pt, en e es.`);
