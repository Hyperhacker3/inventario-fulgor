# Edición en grupo de productos

Actualizado: 26 de noviembre de 2026.

## Uso

1. En **Inventario**, administración pulsa **Seleccionar varios productos** (icono de lista con marcas, junto a filtros y vistas). El botón queda hundido mientras la selección está activa.
2. Cada producto muestra una casilla. Tocar el producto o su casilla lo elige; tocar el nombre sigue abriendo la ficha.
3. **Seleccionar página** y **Seleccionar resultados** eligen los productos visibles o todos los filtrados. **Limpiar selección** los quita. La selección se conserva al cambiar de página, filtros o pantalla. Volver a pulsar el botón termina la selección y la limpia.
4. **Editar selección** abre una ventana con los datos compartidos. Marque solo los datos que quiere cambiar:
   - Categoría (categorías activas del catálogo).
   - Estado (BUENO, REGULAR, MALO, EN REPARACIÓN, PARA REPARAR o RETAZOS).
   - Marca (vacía la quita).
   - Stock mínimo (en la unidad de cada producto).
   - Ubicación: almacén → estantería → nivel → caja, con creación de estanterías, niveles y cajas.
5. Si todos los productos comparten un valor aparece escrito; si no, la ventana indica que tienen valores distintos.

Solo los datos marcados viajan a Supabase. Cantidades, unidades de medida, precios, pesos, fotos, nombres, códigos, prefijos y documentos anteriores no cambian. No se ofrecen unidad, valor ni peso porque dependen de la unidad de cada producto y cambiarlos en grupo puede alterar valores de inventario.

## Garantías

- Todo o nada: si un producto falla (por ejemplo, fue archivado o la caja no pertenece al nivel), no se aplica ningún cambio.
- Cada dato se actualiza solo en los productos donde realmente cambia. Los cambios de ubicación generan un movimiento REUBICACION por producto mediante el disparador existente.
- Cada edición tiene un UUID de solicitud. Si la respuesta no llega, volver a guardar los mismos datos reutiliza el UUID y Supabase devuelve el resultado confirmado sin repetir cambios ni historial.
- La función comprueba el rol de administración, categorías activas, estados admitidos, marca de hasta 100 caracteres, stock mínimo no negativo con tres decimales y la jerarquía de ubicación. Máximo 5.000 productos por edición.
- La tabla de solicitudes no es accesible desde el frontend (RLS sin políticas y sin permisos directos).

## Activación

El usuario debe ejecutar completo, desde su cuenta de Supabase, `supabase/migrations/20261126000100_bulk_item_edit.sql`. Es repetible y no modifica productos al ejecutarse. Hasta activarla, la selección funciona, pero Guardar cambios muestra el mensaje de activación y conserva el formulario sin escribir nada.

## Comprobaciones

PGlite comprueba la migración repetida, productos intactos, permisos por rol, cambios solo en los campos elegidos, conservación de cantidades/precios/pesos/fotos, historial de reubicación sin duplicados, reintento confirmado, rechazo de solicitudes distintas con el mismo UUID, validaciones, rollback completo ante una ubicación inválida o un producto archivado, borrado de marca y retirada de ubicación. Las pruebas DOM cubren selección por casilla, superficie y etiqueta, apertura de ficha por nombre, bloqueo durante el guardado, envío de solo los datos marcados, conservación del borrador ante errores y reutilización del UUID. No se probó geometría visual, rendimiento con miles de productos en un dispositivo real ni la ejecución en Supabase de producción.
