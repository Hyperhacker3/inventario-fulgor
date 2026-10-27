# Código de remisión con la ciudad del proyecto

Actualizado el 27 de octubre de 2026.

## Datos del código

Formato nuevo: REM-ORIGEN-CIUDAD_DEL_PROYECTO-AAAAMMDD-CONSECUTIVO.

- Origen: Lugar de remisión.
- Ciudad: campo Ciudad del proyecto, guardado en proyectos.ubicacion y copiado a remisiones.ubicacion al emitir. No se usa el nombre del proyecto ni Lugar de destino.
- Fecha: emisión según America/Bogota en el servidor, independiente de la fecha opcional de salida.
- Consecutivo: contador anual compartido, sin reiniciarlo por ciudad, dirección ni proyecto.

Ejemplo: origen Honda, proyecto en Bogotá y destino Calle 40 # 12-34 producen REM-HONDA-BOGOTA-20261027-008. La dirección se conserva en el campo Lugar de destino y en el PDF, pero no entra en el código.

## Ciudad del proyecto

Crear un proyecto desde Salidas y crear/editar en Administración de datos → Proyectos pide solo ciudad, sin dirección ni departamento, con hasta 80 caracteres. Se conservan nombres compuestos, tildes, puntos y apóstrofes; se normalizan espacios. La validación rechaza campos vacíos, números, separadores de direcciones y palabras comunes de vías. No es un catálogo geográfico ni permite deducir la ciudad de una dirección.

Los proyectos anteriores mantienen su texto. Si contienen una dirección o no tienen ciudad, administración debe corregir Ciudad del proyecto antes de una salida nueva. El formulario muestra el dato guardado y avisa del problema; no usa el destino como alternativa ni cambia datos en masa. Finalizar/reactivar proyectos no obliga a reescribir ubicaciones históricas sin modificar.

## Activación en Supabase

Ejecute completo [20261027000100_project_city_remission_code.sql](../supabase/migrations/20261027000100_project_city_remission_code.sql) desde la cuenta del usuario en el SQL Editor, después de las migraciones anteriores. Es transaccional y repetible. No modifica proyectos, remisiones, stock, contador ni historial existentes.

La función de salida conserva su firma, permisos y comprobaciones de ruta, dueño, fotos, pesos, importes y empresa. El código se construye desde la copia de ubicación del proyecto capturada por la transacción existente. Una ciudad inválida hace que se revierta toda la emisión. Se añade project_city_remission_ready para que la web compruebe la versión antes de emitir; no se cambia silenciosamente al formato previo mientras falta la migración.

Después de ejecutar el SQL, recargue la aplicación o pulse Comprobar de nuevo en el aviso. Publicar el frontend o pasar PGlite no confirma la aplicación del SQL en Supabase real.

## Historial y reintentos

Los documentos anteriores conservan códigos, referencias y snapshots. Un reintento de una salida emitida devuelve la copia original antes de validar la ciudad actual del proyecto, incluso si este cambió de ciudad o se finalizó. No descuenta otra vez ni consume otro consecutivo. No se permite alterar la dirección de entrega, materiales, fotos u otros datos de una solicitud ya emitida.

## Comprobación

Las pruebas locales verifican ciudad independiente de dirección, creación/edición de campos, validación, rollback, roles, contador anual, conservación de documentos y compatibilidad con fotografías WebP y reintentos. La migración se prueba con PostgreSQL embebido. No se ejecuta SQL de producción ni se usa automatización de navegador; la revisión visual y la comprobación posterior en Supabase real corresponden al usuario.

Verificación del código con ciudad: typecheck, lint, 194 pruebas unitarias y 37 de integración (231 en total) y build correctos con Node 22.23.3 / pnpm 11.19.0. PGlite comprueba ciudad independiente de dirección, datos anteriores intactos, repetición de migración, WebP, permisos, contador y rollback/reintentos. SQL en Supabase real pendiente del usuario; revisión visual pendiente, sin automatización de navegador.
