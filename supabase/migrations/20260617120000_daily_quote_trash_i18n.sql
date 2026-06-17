-- Tradução da frase sobre lixo na praia
UPDATE public.daily_quotes
SET
  text_en = 'Conscious surfers take their trash away and help keep the beach clean.',
  text_es = 'Los surfistas conscientes se llevan su basura y ayudan a mantener la playa limpia.'
WHERE text ILIKE '%Surfistas conscientes%lixo%praia limpa%'
  AND (
    text_en IS NULL OR btrim(text_en) = '' OR text_en = text
    OR text_es IS NULL OR btrim(text_es) = '' OR text_es = text
  );
