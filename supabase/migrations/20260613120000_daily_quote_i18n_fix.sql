-- Corrige traduções da frase do alongamento quando text_en/text_es estão vazios ou iguais ao PT
UPDATE public.daily_quotes
SET
  text_en = 'Stretching before your session helps performance and reduces injury risk.',
  text_es = 'Estirar antes de la sesión mejora el rendimiento y reduce el riesgo de lesiones.'
WHERE text ILIKE '%Alongar antes da sessão%'
  AND (
    text_en IS NULL OR btrim(text_en) = '' OR text_en = text
    OR text_es IS NULL OR btrim(text_es) = '' OR text_es = text
  );
