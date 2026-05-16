
ALTER TABLE public.daily_quotes
  ADD COLUMN IF NOT EXISTS text_en text,
  ADD COLUMN IF NOT EXISTS text_es text;

UPDATE public.daily_quotes SET text_en = 'The best wave of your life is still to come.', text_es = 'La mejor ola de tu vida aún está por venir.' WHERE id = '41a335b9-5cfa-41bf-98b5-f5c63542f4ff';
UPDATE public.daily_quotes SET text_en = 'The ocean is in no hurry, but it reaches everywhere.', text_es = 'El océano no tiene prisa, pero llega a todas partes.' WHERE id = '8ed5c11e-69fe-411c-883d-6c795d0e8bc8';
UPDATE public.daily_quotes SET text_en = 'Surfing is dancing with nature.', text_es = 'Surfear es bailar con la naturaleza.' WHERE id = '7690ab5f-dab5-4aed-9294-230b3a81980d';
UPDATE public.daily_quotes SET text_en = 'Every missed wave teaches you to wait for the next one.', text_es = 'Cada ola perdida te enseña a esperar la siguiente.' WHERE id = 'd2866f96-85d0-4e7d-80f6-eadd98077257';
UPDATE public.daily_quotes SET text_en = 'Don''t force the wave, let it come to you.', text_es = 'No fuerces la ola, deja que venga a ti.' WHERE id = '1d8bdcce-7dd8-4b02-909f-26a6f4eaadb4';
UPDATE public.daily_quotes SET text_en = 'The sea rewards those who respect its timing.', text_es = 'El mar recompensa a quien respeta sus tiempos.' WHERE id = 'bcc8078c-4494-4210-8f4c-9357bee81a93';
UPDATE public.daily_quotes SET text_en = 'Courage is paddling out when everyone else is heading back to the beach.', text_es = 'Coraje es remar cuando todos vuelven a la playa.' WHERE id = '06d06316-8bf0-4b62-a479-fbb91877bd15';
UPDATE public.daily_quotes SET text_en = 'The board follows intention, not force.', text_es = 'La tabla sigue la intención, no la fuerza.' WHERE id = '0580b085-a2bd-487e-8015-3ff6f9910f27';
UPDATE public.daily_quotes SET text_en = 'Breathe deeply. The sea always gives back what you need.', text_es = 'Respira hondo. El mar siempre devuelve lo que necesitas.' WHERE id = 'd194190c-2574-46c8-8815-e951eb3de132';
UPDATE public.daily_quotes SET text_en = 'Surfing is a way of meditating in motion.', text_es = 'Surfear es una forma de meditar en movimiento.' WHERE id = '7d494c30-129b-4ef1-b56a-0f309704191f';
UPDATE public.daily_quotes SET text_en = 'There''s no bad sea, only an unprepared surfer.', text_es = 'No hay mar malo, solo un surfista mal preparado.' WHERE id = '9b567c5f-ab50-4b11-b4c1-0036f896071f';
UPDATE public.daily_quotes SET text_en = 'The first wave of the day has a unique taste.', text_es = 'La primera ola del día tiene un sabor único.' WHERE id = '5bbe5015-858c-4d46-bb39-187b39991254';
UPDATE public.daily_quotes SET text_en = 'Every wipeout is a teacher in disguise.', text_es = 'Cada wipeout es un maestro disfrazado.' WHERE id = '35908135-ac8b-402a-abaa-21f51a14b8f0';
UPDATE public.daily_quotes SET text_en = 'Surfing starts long before the water.', text_es = 'El surf empieza mucho antes del agua.' WHERE id = '577383a6-dd1e-4915-825a-5381b21312d4';
UPDATE public.daily_quotes SET text_en = 'Come back tomorrow. The sea will be waiting for you.', text_es = 'Vuelve mañana. El mar estará esperándote.' WHERE id = '4deb01db-6e4d-4188-9f13-2afecbfa288d';
