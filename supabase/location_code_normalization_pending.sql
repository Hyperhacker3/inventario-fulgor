-- Solo lectura desde SQL Editor: pendientes de la última normalización parcial.
SELECT tipo,ubicacion_id,nombre,padre_id,codigo_actual,codigo_propuesto,motivo,revisado_at
FROM public.inventario_ubicacion_codigos_pendientes
ORDER BY tipo,padre_id,codigo_propuesto,ubicacion_id;
