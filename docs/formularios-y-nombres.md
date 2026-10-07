# Formularios, inventario y nombres en mayúsculas

Actualizado el 7 de octubre de 2026.

## Nivel duplicado

Nuevo ítem mostraba dos selectores de Nivel después de cambiar la ubicación porque Nivel y Caja compartían la misma clave React cuando sus padres estaban vacíos. Las claves ahora incluyen el tipo de selector. Solo aparece un control de cada tipo; cambiar un padre limpia la selección y los borradores dependientes. Se mantiene almacén → estantería → nivel → caja y la creación en línea.

## Desplazamiento de los formularios

Nuevo ítem, Entradas y Salidas desplazan la pantalla al primer campo que falla la validación nativa o al mensaje de error de validación/guardado. Los errores de crear prefijos, categorías, estanterías, niveles, cajas o preparar fotografías también se hacen visibles. Los mensajes reciben foco; los selectores personalizados desplazan su botón visible, manteniendo validación nativa.

Una escritura confirmada vuelve al inicio del área principal. Un fallo conserva borradores y reintentos; una actualización de datos o un formulario que se cierra no desplaza otra pantalla. Movimiento reducido usa desplazamiento inmediato. Salidas mantiene la apertura del PDF tras guardar. Entradas conserva el buscador y el producto seleccionado, con la confirmación dentro de Datos de la entrada.

## Presentación de Inventario

En lista, el nombre aparece en mayúsculas, negrita y 16 px en móvil / 18 px desde 640 px, con dos líneas y elipsis. Debajo no aparecen marca, categoría, peso, unidad ni etiquetas de condición. Categoría permanece en su columna cuando hay ancho; la unidad permanece junto a Stock para interpretar la cantidad. La fila completa y el nombre accesible siguen abriendo el producto.

En cuadrícula, el nombre también reserva dos líneas y usa elipsis y conserva marca, código, ubicación y el indicador de disponibilidad/condición. Se retiran categoría, peso y unidad del contenido. Se elimina Detalles; el único botón independiente es Agregar a la salida, con icono rojo, nombre accesible y superficie táctil de 44 px sobre la esquina inferior derecha de la fotografía, sin fila propia debajo. No aparece para consulta y se deshabilita sin disponibilidad. Pulsarlo no abre simultáneamente la ficha.

La ubicación visible en lista y cuadrícula se limita al nombre del almacén, sin estantería, nivel ni caja. La columna de lista se llama Almacén; si no hay uno asignado, se muestra Sin almacén asignado. La ficha y los filtros mantienen la jerarquía completa.

## Guardado en mayúsculas y activación

Inventario se ordena por última modificación descendente, con ID ascendente en empates, antes de paginar. Altas, edición, entradas/salidas y Realtime utilizan las fechas existentes, sin SQL nuevo. El nombre se limita a dos líneas con elipsis, reservando igual altura en lista/cuadrícula; el texto completo continúa en título, nombre accesible y ficha. En lista móvil bajo 640 px solo se ven nombre, stock/unidad y salida, sin código/foto ni scroll horizontal. Tablet/PC mantienen el código, que también se oculta en cuadrícula móvil. Buscar/Limpiar se retiran de buscadores; filtros conservan su reinicio.

Las altas y ediciones desde la app normalizan nombre y marca al guardar, conservando tildes. Los nombres existentes se presentan en mayúsculas en Inventario sin una modificación masiva de la base. Descripciones, observaciones, identificadores, fotos, unidades y valores conservan su tratamiento.

Salidas normaliza lugares de remisión/destino, entrega/recepción y cargos, transportador y placa antes de enviar. Para que los snapshots que toma Supabase del proyecto, cliente, ubicación, catálogo y usuario también queden en mayúsculas, ejecutar **completo** `supabase/migrations/20261007000300_uppercase_registration.sql` en el SQL Editor, después de `20261007000200_remission_route.sql` y las migraciones anteriores. Termine envíos/reintentos pendientes de la versión previa antes de actualizar y recargue la aplicación.

La migración aplica mayúsculas a nuevos nombres/marcas y sus ediciones, y a nuevas remisiones e historial de salida. Mantiene roles/RLS, stocks, importes, fotos, datos numéricos y solicitudes originales. Un nombre/marca anterior no cambia al actualizar solo stock u otros datos. Los documentos existentes conservan textos, códigos y reintentos; no se recapturan con valores del catálogo. La migración puede repetirse sin renombrarlos ni descontar stock.

Se ensayó con PostgreSQL embebido; **no se ejecutó en Supabase real** porque el agente no dispone de sesión administrativa. La UI y los textos enviados por el cliente funcionan sin este paso adicional; los datos copiados del catálogo/usuario por el servidor necesitan activarlo.

## Verificación y revisión

Pasaron typecheck, lint, **156 pruebas unitarias y 34 de integración (190 en total)** y build. Se comprueban errores repetidos, validación nativa/proxy, foco, borradores, movimiento reducido, éxito y desmontaje, claves/cascada de ubicaciones, contenido y acciones del inventario, mayúsculas, permisos, reintentos y preservación histórica. Sin computer use, automatización de navegador ni escrituras en Supabase real. La geometría y el desplazamiento físico se revisan con el usuario.

Comprobar en teléfono y PC: cambiar estantería/nivel, provocar errores de creación/guardado, repetirlos y completar un guardado. Revisar nombres largos en lista/cuadrícula y la acción roja independiente. Tras activar SQL, comprobar mayúsculas de nuevas altas/salidas y conservación de documentos anteriores, sin usar existencias reales para pruebas ficticias.
