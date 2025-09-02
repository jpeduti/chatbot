SELECT
  carrera_interes,
  count(DISTINCT whatsapp) AS usuarios_unicos,
  count(*) AS total_consultas,
  round(
    (
      ((count(*)) :: numeric * 1.0) / (count(DISTINCT whatsapp)) :: numeric
    ),
    2
  ) AS promedio_sesiones_por_usuario,
  count(*) FILTER (
    WHERE
      (evolucion_interes = 'reconversion' :: text)
  ) AS reconversiones,
  avg(duracion_sesion) FILTER (
    WHERE
      (duracion_sesion IS NOT NULL)
  ) AS duracion_promedio_sesion
FROM
  prospecto_historial
WHERE
  (
    (carrera_interes <> 'Sin especificar' :: text)
    AND (
      created_at >= (CURRENT_DATE - '30 days' :: INTERVAL)
    )
  )
GROUP BY
  carrera_interes
HAVING
  (count(DISTINCT whatsapp) >= 2)
ORDER BY
  (count(DISTINCT whatsapp)) DESC;