SELECT
  whatsapp,
  nombre,
  email,
  telefono,
  telefono_confirmado,
  preferencia_contacto,
  nivel_interes,
  total_sesiones,
  ultima_interaccion,
  CASE
    WHEN (telefono_confirmado = false) THEN 'Número no confirmado por usuario' :: text
    WHEN (
      preferencia_contacto = 'sin_telefono_explicito' :: text
    ) THEN 'Usuario prefiere no compartir teléfono' :: text
    WHEN (preferencia_contacto = 'solo_email' :: text) THEN 'Usuario prefiere contacto solo por email' :: text
    ELSE 'Contacto normal' :: text
  END AS nota_privacidad
FROM
  prospecto_actual
WHERE
  (
    (telefono_confirmado = false)
    OR (preferencia_contacto <> 'normal' :: text)
  )
ORDER BY
  ultima_interaccion DESC;