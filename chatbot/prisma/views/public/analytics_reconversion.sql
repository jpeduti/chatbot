WITH stats_diarias AS (
  SELECT
    date_trunc('day' :: text, prospecto_historial.created_at) AS fecha,
    count(*) FILTER (
      WHERE
        (prospecto_historial.sesion_numero = 1)
    ) AS nuevos_usuarios,
    count(*) FILTER (
      WHERE
        (prospecto_historial.sesion_numero > 1)
    ) AS sesiones_reconversion,
    count(DISTINCT prospecto_historial.whatsapp) FILTER (
      WHERE
        (prospecto_historial.sesion_numero > 1)
    ) AS usuarios_reconvertidos,
    avg(prospecto_historial.sesion_numero) AS promedio_sesiones_por_dia
  FROM
    prospecto_historial
  WHERE
    (
      prospecto_historial.created_at >= (CURRENT_DATE - '30 days' :: INTERVAL)
    )
  GROUP BY
    (
      date_trunc('day' :: text, prospecto_historial.created_at)
    )
)
SELECT
  fecha,
  nuevos_usuarios,
  usuarios_reconvertidos,
  round(
    (
      ((usuarios_reconvertidos) :: numeric * 100.0) / (NULLIF(nuevos_usuarios, 0)) :: numeric
    ),
    2
  ) AS tasa_reconversion_pct,
  promedio_sesiones_por_dia
FROM
  stats_diarias
ORDER BY
  fecha DESC;