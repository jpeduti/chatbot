SELECT
  whatsapp,
  nombre,
  email,
  telefono,
  carrera_interes,
  facultad_interes,
  nivel_interes,
  estado,
  perfil_usuario,
  total_sesiones,
  es_prioritario,
  primera_interaccion,
  ultima_interaccion,
  assigned_to,
  proximo_seguimiento,
  CASE
    WHEN (
      ultima_interaccion >= (NOW() - '01:00:00' :: INTERVAL)
    ) THEN 'muy_reciente' :: text
    WHEN (
      ultima_interaccion >= (NOW() - '1 day' :: INTERVAL)
    ) THEN 'reciente' :: text
    WHEN (
      ultima_interaccion >= (NOW() - '7 days' :: INTERVAL)
    ) THEN 'esta_semana' :: text
    ELSE 'antigua' :: text
  END AS recencia,
  (
    EXTRACT(
      epoch
      FROM
        (ultima_interaccion - primera_interaccion)
    ) / (3600) :: numeric
  ) AS horas_engagement
FROM
  prospecto_actual
ORDER BY
  es_prioritario DESC,
  ultima_interaccion DESC;