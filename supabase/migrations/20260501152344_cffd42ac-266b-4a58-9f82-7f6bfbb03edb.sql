
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS title_es text,
  ADD COLUMN IF NOT EXISTS body_en text,
  ADD COLUMN IF NOT EXISTS body_es text;

UPDATE public.posts SET
  title_en = 'Full warm-up before surfing',
  title_es = 'Calentamiento completo antes de surfear',
  body_en  = '8-minute routine to prepare shoulders, spine and hips before hitting the water.',
  body_es  = 'Rutina de 8 minutos para preparar hombros, columna y caderas antes de entrar al mar.'
WHERE id = '7cc45e0f-890a-4bca-9ef0-55f1b5ba2097';

UPDATE public.posts SET
  title_en = 'Hip mobility for the pop-up',
  title_es = 'Movilidad de cadera para el pop-up',
  body_en  = 'Exercises focused on opening the hips and improving pop-up explosiveness.',
  body_es  = 'Ejercicios enfocados en soltar la cadera y mejorar la explosión del pop-up.'
WHERE id = '8a0c91d3-01d0-47a4-9187-0028f4e7623c';

UPDATE public.posts SET
  title_en = 'Dynamic shoulder stretching',
  title_es = 'Estiramiento dinámico de hombros',
  body_en  = 'Quick sequence to prep your paddling and prevent injuries.',
  body_es  = 'Secuencia rápida para preparar la remada y evitar lesiones.'
WHERE id = '75fe1545-3a68-4582-9299-61c147f4863e';

UPDATE public.posts SET
  title_en = 'Core activation for surf',
  title_es = 'Activación del core para el surf',
  body_en  = 'Strong core = stable base on the board. 5 minutes before going in.',
  body_es  = 'Core fuerte = base estable en la tabla. 5 minutos antes de entrar.'
WHERE id = 'f22f5aac-2746-4f35-80eb-0ad2872572cb';

UPDATE public.posts SET
  title_en = 'How to read the ocean before paddling out',
  title_es = 'Cómo leer el mar antes de entrar',
  body_en  = 'Learn to spot channels, sets and currents at any beach.',
  body_es  = 'Aprende a identificar canales, series y corrientes en cualquier playa.'
WHERE id = 'c8c87258-9728-43d8-9167-b934909b056d';

UPDATE public.posts SET
  title_en = 'Perfect pop-up: step by step',
  title_es = 'Pop-up perfecto: paso a paso',
  body_en  = 'The correct pop-up technique that will unlock your next waves.',
  body_es  = 'La técnica correcta de pop-up que destrabará tus próximas olas.'
WHERE id = 'd633c5cc-9935-474a-97ea-44cd2fdb9530';

UPDATE public.posts SET
  title_en = 'Line-up positioning',
  title_es = 'Posicionamiento en el line-up',
  body_en  = 'Where to sit, how to wait for the set, and surf etiquette.',
  body_es  = 'Dónde sentarse, cómo esperar la serie y la etiqueta del surf.'
WHERE id = '248f1497-c3d3-4996-a445-f9892a00cf82';

UPDATE public.posts SET
  title_en = 'Efficient paddling to catch more waves',
  title_es = 'Remada eficiente para coger más olas',
  body_en  = 'Small paddling adjustments that change everything when catching waves.',
  body_es  = 'Pequeños ajustes en la remada que lo cambian todo al coger la ola.'
WHERE id = 'ab6e5dd7-db3f-468d-a0fe-b6d3484ffe7e';
