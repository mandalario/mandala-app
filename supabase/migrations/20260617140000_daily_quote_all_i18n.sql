-- Preenche EN/ES de todas as frases do dia conhecidas (quando vazias ou iguais ao PT)
UPDATE public.daily_quotes AS q
SET
  text_en = v.en,
  text_es = v.es
FROM (
  VALUES
    (
      'Alongar antes da sessão ajuda no desempenho e reduz o risco de lesões.',
      'Stretching before your session helps performance and reduces injury risk.',
      'Estirar antes de la sesión mejora el rendimiento y reduce el riesgo de lesiones.'
    ),
    (
      'Surfistas conscientes levam seu lixo embora e ajudam a manter a praia limpa',
      'Conscious surfers take their trash away and help keep the beach clean.',
      'Los surfistas conscientes se llevan su basura y ayudan a mantener la playa limpia.'
    ),
    (
      'A melhor onda da sua vida ainda está por vir.',
      'The best wave of your life is still to come.',
      'La mejor ola de tu vida aún está por venir.'
    ),
    (
      'O oceano não tem pressa, mas chega a todos os lugares.',
      'The ocean is in no hurry, but it reaches everywhere.',
      'El océano no tiene prisa, pero llega a todas partes.'
    ),
    (
      'Surfar é dançar com a natureza.',
      'Surfing is dancing with nature.',
      'Surfear es bailar con la naturaleza.'
    ),
    (
      'Cada ola perdida te ensina a esperar pela próxima.',
      'Every missed wave teaches you to wait for the next one.',
      'Cada ola perdida te enseña a esperar la siguiente.'
    ),
    (
      'Não force a onda, deixe ela vir até você.',
      'Don''t force the wave, let it come to you.',
      'No fuerces la ola, deja que venga a ti.'
    ),
    (
      'O mar recompensa quem respeita seus tempos.',
      'The sea rewards those who respect its timing.',
      'El mar recompensa a quien respeta sus tiempos.'
    ),
    (
      'Coragem é remar quando todo mundo está voltando para a praia.',
      'Courage is paddling out when everyone else is heading back to the beach.',
      'Coraje es remar cuando todos vuelven a la playa.'
    ),
    (
      'A prancha segue a intenção, não a força.',
      'The board follows intention, not force.',
      'La tabla sigue la intención, no la fuerza.'
    ),
    (
      'Respire fundo. O mar sempre devolve o que você precisa.',
      'Breathe deeply. The sea always gives back what you need.',
      'Respira hondo. El mar siempre devuelve lo que necesitas.'
    ),
    (
      'Surfar é uma forma de meditar em movimento.',
      'Surfing is a way of meditating in motion.',
      'Surfear es una forma de meditar en movimiento.'
    ),
    (
      'Não há mar ruim, apenas um surfista mal preparado.',
      'There''s no bad sea, only an unprepared surfer.',
      'No hay mar malo, solo un surfista mal preparado.'
    ),
    (
      'A primeira onda do dia tem um gosto único.',
      'The first wave of the day has a unique taste.',
      'La primera ola del día tiene un sabor único.'
    ),
    (
      'Cada wipeout é um professor disfarçado.',
      'Every wipeout is a teacher in disguise.',
      'Cada wipeout es un maestro disfrazado.'
    ),
    (
      'O surf começa muito antes da água.',
      'Surfing starts long before the water.',
      'El surf empieza mucho antes del agua.'
    ),
    (
      'Volte amanhã. O mar estará te esperando.',
      'Come back tomorrow. The sea will be waiting for you.',
      'Vuelve mañana. El mar estará esperándote.'
    )
) AS v(pt, en, es)
WHERE btrim(regexp_replace(btrim(q.text), '[.!?…]+$', '')) = btrim(regexp_replace(btrim(v.pt), '[.!?…]+$', ''))
  AND (
    q.text_en IS NULL OR btrim(q.text_en) = '' OR q.text_en = q.text
    OR q.text_es IS NULL OR btrim(q.text_es) = '' OR q.text_es = q.text
  );
