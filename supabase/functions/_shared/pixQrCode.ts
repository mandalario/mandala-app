/** TLV fields for PIX copia e cola (EMV QR). */
type TlvField = { id: string; value: string };

function parseTlv(payload: string): TlvField[] {
  const fields: TlvField[] = [];
  let i = 0;
  while (i + 4 <= payload.length) {
    const id = payload.slice(i, i + 2);
    const len = Number.parseInt(payload.slice(i + 2, i + 4), 10);
    if (!Number.isFinite(len) || len < 0 || i + 4 + len > payload.length) break;
    fields.push({ id, value: payload.slice(i + 4, i + 4 + len) });
    i += 4 + len;
  }
  return fields;
}

function buildTlv(fields: TlvField[]): string {
  return fields.map(({ id, value }) => `${id}${String(value.length).padStart(2, "0")}${value}`).join("");
}

/** CRC16-CCITT (0x1021), per BACEN PIX spec. */
function crc16Pix(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ polynomial) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Mercado Pago sometimes returns merchant city (tag 60) with spaces (e.g. "Sao Paulo"),
 * which breaks PIX copia e cola in several banking apps.
 */
export function sanitizePixQrCode(qrCode: string): string {
  const trimmed = qrCode.trim();
  if (!trimmed) return qrCode;

  let body = trimmed;
  if (/6304[0-9A-Fa-f]{4}$/.test(body)) {
    body = body.slice(0, -8);
  }

  const fields = parseTlv(body);
  if (fields.length === 0) return qrCode;

  let changed = false;
  const sanitized = fields.map((field) => {
    if (field.id !== "60") return field;
    const city = field.value.replace(/\s/g, "");
    if (city === field.value) return field;
    changed = true;
    return { ...field, value: city };
  });

  if (!changed) return qrCode;

  const rebuilt = buildTlv(sanitized);
  const crc = crc16Pix(`${rebuilt}6304`);
  return `${rebuilt}6304${crc}`;
}
