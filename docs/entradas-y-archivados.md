# Entradas, Salidas y eliminación de archivados

## Activar en Supabase

1. Abra `supabase/migrations/20261006000200_archived_inventory.sql` y copie todo su contenido.
2. Entre en el proyecto de Supabase → SQL Editor → New query.
3. Pegue el contenido y pulse Run. Si aparece una advertencia por operaciones destructivas, esta migración modifica funciones, restricciones y disparadores; **no borra los productos existentes**.
4. El resultado esperado es `Success. No rows returned`.
5. Espere a que el nuevo despliegue de Vercel esté Ready y recargue la web.

Requiere haber aplicado las migraciones anteriores de inventario seguro, fotos privadas y administración de datos. No requiere pagar otro plan. Las pruebas locales se ejecutan con datos de prueba en PGlite; no acceden al inventario real.

## Elementos archivados

Abra **Administración de datos → Archivados**. Busque por código o nombre y abra un producto. Su detalle permite consultar fotos, existencias, ubicación y movimientos, sin editarlo ni registrar entradas o salidas.

Para borrarlo, pulse **Eliminar definitivamente**, escriba su código exactamente y confirme. Solo un administrador puede hacerlo y Supabase exige que el producto esté archivado. Los productos activos conservan únicamente la acción **Archivar**.

La eliminación retira el producto del catálogo y limpia sus fotos de Supabase Storage, incluida cualquier miniatura antigua. Las fotos compartidas con otros productos se conservan. Las remisiones y movimientos históricos mantienen sus datos; se guarda un registro interno mínimo de la eliminación y las solicitudes de alta originales para evitar que un reintento recree el producto. El consecutivo de códigos no retrocede.

Si falla la limpieza de fotos después de borrar el producto, queda una tarea en Supabase y aparece **Reintentar limpieza** en Archivados. No se deben borrar manualmente registros de `storage.objects`: la aplicación retira los archivos con la API de Storage y comprueba que hayan desaparecido antes de completar la tarea.

## Entradas

Abra **Entradas** en el menú. El buscador muestra resultados al escribir y admite materiales sin stock. Seleccione un material, indique la cantidad recibida y el motivo o referencia de recepción, y pulse **Registrar entrada**. Las cantidades admiten hasta tres decimales y también pueden ajustarse con +/−.

Supabase suma la cantidad al stock actual y registra el responsable autenticado, fecha, motivo y stock anterior y nuevo. La pantalla muestra una confirmación y queda lista para otra recepción. No genera PDF ni remisión. Para un stock pendiente de verificar, primero registre un ajuste de administración desde el detalle del material.

Si falla una solicitud, el formulario conserva sus datos y permite reintentar con el mismo identificador. Supabase evita duplicar ese movimiento. Las cuentas de consulta y las cuentas sin rol no pueden registrar entradas.

## Salidas

El menú, botones, mensajes y remisiones usan la palabra **Salidas**. Se mantienen las claves internas de transporte y las funciones existentes para que las remisiones y borradores anteriores continúen funcionando.
