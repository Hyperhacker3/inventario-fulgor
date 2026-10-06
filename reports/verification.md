# Verificación de la refactorización local

Fecha: 2 de octubre de 2026. Alcance: código, PostgreSQL embebido y verificación del proyecto Supabase mediante el Editor SQL y el inicio de sesión del usuario.

## Resultado comprobado

| Medida | Antes | Después |
| --- | ---: | ---: |
| JavaScript inicial, gzip | 175,87 kB | 59,26 kB |
| CSS, gzip | 18,06 kB | 8,34 kB |
| Archivo fuente más largo | 1.095 líneas | 273 líneas |

El JavaScript inicial se redujo aproximadamente 66 %. Las vistas y los modales se cargan bajo demanda. Supabase se descarga como un módulo adicional de aproximadamente 96,68 kB gzip; por ello la cifra de 59,26 kB describe la entrada inicial, no el total descargado durante una sesión. El número de líneas no es una medida directa de velocidad.

Se comprobaron `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test` y el build de Vite. Pasaron diecinueve pruebas unitarias y seis pruebas de integración con PGlite. Estas cubren mapeos, validación de stock, CSV, permisos básicos de RLS, rechazo de políticas desconocidas, atomicidad e idempotencia del despacho, movimientos, alta auditada, importación repetible y la consulta de auditoría de solo lectura. El test de idempotencia rechaza reutilizar una solicitud con otro contenido.

`python scripts/prepare-import.py` cotejó 677 filas del Excel con 674 registros previamente codificados. Recuperó tres filas omitidas, conservó 25 cantidades decimales y marcó cinco cantidades `#VALUE!` con stock 0 pendiente, según la decisión del usuario. `node scripts/audit-import.mjs --sql` encontró 677 códigos únicos y cero errores. El esquema base ya no carga el artículo de prueba que usaba `EST001`. La importación completa se ensayó en PGlite antes de aplicarla a Supabase.

Tras observar el proyecto remoto con 674 artículos anteriores, se ejecutó el reemplazo transaccional. El Editor SQL devolvió 677 artículos insertados de 677 preparados. Una consulta posterior confirmó 677 productos, cinco con stock pendiente y 25 con cantidad decimal. Se aplicó la migración de fotos privadas, se creó una cuenta Auth con rol `admin` y el usuario inició sesión en la aplicación, donde observó los 677 productos.

Los 677 artículos conservan la ubicación descriptiva original en Supabase. Estanterías y cajas quedan nulas hasta conciliación. El Excel, los JSON completos y el SQL generado se retiraron del árbol de trabajo local. El código de la aplicación no incluye productos de ejemplo y consulta exclusivamente Supabase. Los tests usan datos sintéticos.

## Cambios preparados

La aplicación usa sesión de Supabase Auth, roles aplicados también en SQL, operaciones transaccionales de inventario y un bucket privado para fotos. El cliente conserva los IDs como cadenas, pagina historial y remisiones, usa caché por entidad y actualizaciones dirigidas, y separa las responsabilidades de las vistas grandes en componentes y módulos.

Tras una escritura confirmada, la interfaz conserva el resultado aunque falle la lectura inmediata de actualización; los artículos devueltos por la base se aplican a la caché y la sincronización posterior puede reintentarse. Una falla de refresco ya no se presenta como una escritura fallida.

## Verificaciones aún necesarias

1. Probar escrituras de catálogo, fotos privadas, Realtime y dos despachos simultáneos desde conexiones distintas con usuarios de cada rol. PGlite no sustituye esa prueba de concurrencia real.
2. Los archivos originales estuvieron versionados en commits anteriores. Se retiraron del árbol de trabajo y se reescribió el historial de `main` para excluirlos. La rama de GitHub ya apunta a la historia depurada; otras copias, referencias o cachés externas de los commits antiguos requieren revisión aparte.
3. Conciliar las ubicaciones cuando termine la organización de los almacenes. El usuario confirmó que ya corrigió manualmente las cinco cantidades pendientes. Medir peticiones, latencia y renderizado con 677 y 5.000 artículos y 10.000 movimientos. El inventario aún se descarga completo al entrar y `InventoryContext` sigue publicando un valor agregado; para volúmenes mayores hay que pasar inventario y resúmenes a consultas paginadas o agregadas y separar los consumidores de estado visual.
4. Verificar visualmente formularios, cámara, navegación móvil y remisiones impresas de 1, 20 y 100 renglones en un navegador. No se hizo esta comprobación porque se solicitó no usar control de computadora.
5. Ejecutar el flujo de GitHub Actions en el repositorio remoto. El archivo CI existe, pero no hay un resultado remoto en esta sesión.

La implementación local es revisable. Los puntos anteriores son límites explícitos de la verificación y pasos de puesta en marcha, no resultados comprobados.

## Correcciones de interacción del 2 de octubre

Los campos numéricos conservan un texto vacío durante la edición y validan los campos obligatorios antes de guardar. La reconfirmación de una sesión con la misma cuenta y rol conserva la caché; cambiar de pestaña ya no la vacía. Las pantallas registran su navegación en el historial del navegador y la preferencia de lista o cuadrícula se conserva en localStorage, incluso al cerrar sesión. Cuatro pruebas de regresión con DOM simulado comprueban estas interacciones. No se modificó el inventario remoto durante estas correcciones.

## Panel de inventario

El inicio dejó de duplicar el catálogo. Ahora resume disponibilidad, stock bajo, conteos pendientes y productos con daños; presenta gráficas por estado, categoría y almacén, balances separados por unidad de medida, prioridades con acceso al detalle y organización de ubicaciones. El filtro por almacén se aplica a los indicadores y a la actividad reciente. La actividad se limita explícitamente a los últimos 100 movimientos cargados; no representa el historial completo. Dos pruebas comprueban los cálculos con daños, stocks pendientes, decimales, unidades diferentes y productos archivados, además del inventario vacío. Las gráficas usan CSS y no añaden dependencias de producción ni consultas adicionales.

## Fotos cuadradas y almacenamiento

Las fotos del catálogo, detalle y selector usan marcos 1:1 con recorte centrado. La cámara solicita relación 1:1 y recorta la captura al centro cuando el dispositivo ofrece otra proporción. Al guardar, los archivos se convierten a JPEG cuadrado de hasta 600 píxeles por lado y se suben al bucket privado item-images; la base conserva una referencia storage://. Se eliminó la alternativa de devolver imágenes locales como guardado exitoso. Las URL externas nuevas también se importan a Storage cuando el servidor permite descargarlas; si no, se solicita subir el archivo. Al editar un producto con una referencia antigua embebida o externa, se convierte a Storage al guardar. Tres pruebas verifican proporciones, referencias de Storage y rechazo de errores de subida o sesiones ausentes. La subida real desde el navegador del usuario y la cámara física aún requieren comprobación manual.

## Fotografías sin miniaturas

Por petición del usuario se retiró la generación y lectura de miniaturas de 120 píxeles. Ahora se sube una sola imagen cuadrada de hasta 600 × 600 y se utiliza tanto en listados como en el detalle. El detalle muestra la foto al ancho completo de su contenido, respetando sus márgenes, y coloca los textos debajo. Las fotos principales previamente guardadas siguen funcionando; los archivos de miniaturas anteriores se incluyen en la limpieza al reemplazar la foto. La prueba de subida verifica que se envía un solo archivo.

## Productos sin fotografía

Se agregó un marcador compartido con iconos de las 12 categorías y fondo suave. Se usa en cuadrícula, listas, despacho, detalle y selección de foto, incluso como respaldo cuando la imagen no carga. Los marcadores son elementos de interfaz; no generan archivos ni datos en Supabase. Se verificaron tipos, lint y compilación.

## Galería de productos y selección de lentes

El alta y la edición permiten una imagen principal y fotos adicionales, con selección múltiple de archivos, captura, eliminación y cambio de principal. Las fotos se guardan en el bucket privado y sus referencias adicionales se almacenan en especificaciones.fotos_adicionales; no requiere migración del esquema existente. La galería del detalle usa desplazamiento horizontal con ajuste a cada foto, flechas, teclado y puntos que indican la posición activa. Solo se resuelven las fotos visibles y vecinas. Las subidas se procesan secuencialmente; se limpian subidas incompletas y las fotos retiradas se eliminan después de confirmar el guardado. Si se pierde la respuesta de la base, se conservan los archivos subidos porque la escritura puede haber sido aceptada; pueden quedar objetos sin referencia que requieran limpieza posterior.

La cámara enumera dispositivos tras obtener permiso, permite selección por nombre y recorre cada deviceId detectado; se detiene el flujo anterior antes de abrir otro. Solo se exponen los lentes que permita el navegador. Se verificaron 19 pruebas unitarias y 6 de integración, incluido el almacenamiento de fotos adicionales en PostgreSQL y el cambio entre tres cámaras simuladas. Las cámaras físicas y el gesto táctil requieren comprobación manual en el teléfono.
## Administración de proyectos

Se añadió la pantalla Proyectos (menú de escritorio y menú móvil), con alta, edición, finalización y reactivación para administradores. Los demás roles pueden consultar. Finalizar retira el proyecto del selector de despacho sin eliminar las remisiones. El despacho admite escribir un nombre o usar la lista de proyectos activos, y crear un destino desde el mismo formulario. Los cambios se guardan en Supabase y actualizan inmediatamente la caché en memoria; no hay catálogo local de proyectos.

El botón Añadir dos proyectos de ejemplo inserta dos destinos ficticios en Supabase mediante la sesión del administrador. Los identificadores estables y ON CONFLICT DO NOTHING evitan duplicaciones y conservan ediciones o finalizaciones al repetirlo. Pendiente de pulsar en producción: no se dispone de acceso administrativo remoto desde la terminal. No requiere ejecutar SQL ni modificar los 677 productos.

Validación: typecheck, lint y build correctos; 19 pruebas unitarias y 7 de integración. La nueva prueba confirma permisos, idempotencia, conservación del nombre histórico en remisiones, rechazo de despachos a proyectos finalizados y reactivación. Pendiente de comprobación manual de la interfaz en producción.

## Remisiones: formato de empresa y transporte (5 de octubre de 2026)

Se adaptó el formato de REMISION.pdf a la identidad de la aplicación, utilizando public/logo-completo.png. El documento A4 centra su contenido horizontal y verticalmente, elimina filas vacías y espacios artificiales entre tabla y firmas, muestra datos de destino, transporte, observaciones y tres firmas, y mantiene la numeración de páginas. La paginación utiliza alturas medidas después de cargar fuentes y logo; las últimas páginas se equilibran conservando orden y márgenes. El resumen separa cantidades por unidad y diferencia peso registrado de peso total cuando faltan valores. No inventa pesos ni información de transporte para remisiones anteriores.

Se añadieron campos opcionales de teléfonos, transportador, cédula, placa, fechas de despacho y devolución, y peso total por material en kg (hasta tres decimales). La migración supabase/migrations/20261005_remission_transport.sql añade datos_transporte y una RPC que envuelve el despacho atómico existente. La huella de idempotencia incluye transporte y pesos. Se mantienen los permisos y la función anterior para clientes antiguos. Es necesario ejecutar esta migración en Supabase: no se dispone de sesión administrativa remota. Hasta que se aplique, los campos nuevos permanecen deshabilitados y el despacho existente sigue operativo.

Verificación: 22 pruebas unitarias y 8 de integración correctas, incluyendo permisos, validación, persistencia y reintentos sin duplicar stock. Typecheck y lint correctos. Se renderizó el componente real en un navegador de pruebas sin ventana, autorizado expresamente por el usuario únicamente para impresión; no se accedió a la sesión del usuario ni a Supabase. Se revisaron PDFs de seis materiales (1 página), 60 materiales con nombres largos (7 páginas), y observaciones extensas (4 páginas). Se comprobaron márgenes, centrado y ausencia de páginas vacías con medidas de DOM, extracción de PDF y revisión visual. La muestra final está en output/pdf/Remision-EL-TURPIAL.pdf, ignorada por Git junto con el PDF de referencia y los archivos temporales. No se modificaron los productos reales ni las remisiones en Supabase.

## Peso unitario y selección de cantidades (5 de octubre de 2026)

Todos los productos exponen un peso por unidad de inventario, editable por administración desde el alta y el detalle. Se conserva el valor declarado y la unidad g/kg en especificaciones.peso_unitario, junto con los metadatos y fotos existentes. La ausencia de declaración se muestra como pendiente; no se asignaron valores ficticios. La cuadrícula y lista distinguen los pesos pendientes. El cálculo de una línea convierte a kg y multiplica por la cantidad (20 × 40 g = 0,8 kg), admite cantidades fraccionarias y valores pequeños sin redondearlos a cero. El resumen identifica los totales parciales cuando faltan pesos.

La migración supabase/migrations/20261005000100_unit_weights.sql valida los pesos positivos declarados y crea un despacho con cálculo autoritativo desde el catálogo bloqueado. Guarda el peso unitario y total en cada línea de la remisión como una fotografía histórica. Los reintentos conservan ese resultado incluso si el peso del catálogo cambió después; los pesos enviados por el cliente no reemplazan el catálogo. Mantiene la RPC anterior y requiere la migración de transporte ya aplicada por el usuario. Debe ejecutarse el nuevo archivo en Supabase; la generación de despachos nuevos se habilita cuando se detecta esa actualización. El alta y edición del peso usan la columna JSON existente y no requieren cargar un catálogo local.

Las acciones de agregar desde cuadrícula, lista, detalle y lista disponible de despacho abren un diálogo común con entrada numérica, +/−, cantidad ya agregada, stock restante y peso estimado. Solo al confirmar se añade al carrito y aparece un aviso visible durante cinco segundos. La selección impide agregar más que el disponible y valida cambios de stock mientras está abierta; cancelar no agrega y Escape cierra solo este diálogo. Las cantidades del carrito siguen siendo borradores: agregar no descuenta stock.

Validación: 26 pruebas unitarias y 9 de integración correctas (35 en total), typecheck, lint y compilación de producción. Las pruebas incluyen 40 g × 20, mezcla de g/kg, pesos pequeños, cantidades fraccionarias, pesos pendientes, persistencia del catálogo, cálculo en SQL, protección contra pesos falsificados y reintentos después de editar el catálogo. Pruebas DOM simuladas verifican entrada, +/−, confirmación única, límite de stock y Escape; renderizado de la plantilla comprueba las cifras y etiquetas del documento. No se utilizó automatización de navegador en esta actualización. Pendiente de aplicar el SQL y verificar la interfaz en producción con la sesión del usuario. No se modificaron los 677 productos reales ni remisiones históricas desde la terminal.

## Administración unificada de datos (6 de octubre de 2026)

Se integraron códigos, categorías, estanterías, cajas y proyectos en Administración de datos, con acceso en el menú de escritorio y móvil. Proyectos reutiliza sus acciones existentes; finalizar y reactivar conserva las remisiones. La interfaz se carga por separado y se divide en gestores de catálogo y ubicaciones.

Las categorías se leen de Supabase, conservan una clave estable y admiten editar su nombre y disponibilidad. Las categorías personalizadas mantienen su identidad en los mapeadores, filtros, tarjetas, detalle y dashboard; un icono genérico cubre las categorías nuevas sin fotografías. Desactivar una categoría no oculta sus productos existentes.

El alta permite seleccionar un prefijo de tres letras y muestra un código estimado. La RPC create_inventory_item_auto asigna el consecutivo definitivo tomando el máximo entre el contador del prefijo y todos los códigos existentes, incluidos archivados. Mantiene al menos tres dígitos sin truncar después de 999. El bloqueo transaccional serializa cambios de prefijos y altas; los códigos antiguos se conservan al editar el prefijo. La identidad de solicitud evita duplicar productos o movimientos al repetir una escritura idéntica; durante un reintento en el formulario se reutiliza también el payload de fotos ya subidas.

La migración 20261006000100_data_administration.sql conserva el inventario existente, incorpora sus categorías y prefijos a catálogos privados con RLS y deja la lectura y escritura controladas por funciones con roles. Solo admin puede modificar los catálogos o crear productos; operador y consulta pueden leer los catálogos. No se crean copias locales de los productos reales ni se requieren cambios de las remisiones existentes.

Validación: 28 pruebas unitarias y 11 de integración correctas (39 en total), typecheck, lint y compilación de producción correctos. Las pruebas PostgreSQL verifican conservación del inventario al reaplicar, restricciones de rol, categorías activas, consecutivos con archivados, altas enviadas juntas con códigos distintos, salto de 999 a 1000, rollback sin avanzar contador e idempotencia sin duplicar stock. PGlite procesa las solicitudes en un motor local; no sustituye una prueba de carga con conexiones concurrentes en producción. No se utilizó computer use ni un navegador de pruebas. Pendiente de ejecutar la migración desde la cuenta de Supabase y verificar la interfaz del despliegue Vercel.
