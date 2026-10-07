# Inventario turpial

Aplicación de inventario fotovoltaico con React, TypeScript, Vite y Supabase. Incluye almacenes, catálogo, entradas, salidas, remisiones, administración de datos e historial.

## Estado actual y continuidad

Actualizado el 7 de octubre de 2026. El usuario confirmó que la aplicación muestra correctamente el inventario después de añadir 867 elementos del Excel a los 678 anteriores: **1.545 elementos en total en el momento de la verificación**. Los conteos cambian con las altas y bajas posteriores; no deben fijarse en el código.

La aplicación implementa **Liquid Glass y Neumorfismo**, independientes del modo claro/oscuro y con preferencia local. **Neumorfismo es el predeterminado**. El botón para alternarlos está al final del contenido de **Ayuda y conexión**. Tanto el cambio de estilo como el cambio claro/oscuro duran **1,5 segundos**, salvo cuando el dispositivo solicita movimiento reducido. La publicación de esta actualización fue solicitada el 7 de octubre; el resultado del despliegue se comprueba por separado en Vercel y en la URL pública.

Consulte primero [la guía de continuidad](docs/CONTINUIDAD.md) para conocer el estado del inventario, las decisiones de diseño, la demo y los límites de trabajo. El uso, la implementación y la revisión pendiente del cambio visual están en [estilos de interfaz](docs/estilos-interfaz.md).

Para cambiar el estilo, abra **Ayuda y Guía** en escritorio o **Ayuda** desde el menú móvil, desplácese al final y pulse **Cambiar a Liquid Glass** o **Cambiar a Neumorfismo**. El control claro/oscuro conserva su ubicación en la cabecera de escritorio y en el menú móvil. Cada elección se recuerda en este navegador; cambiar una no modifica la otra.

Claro/oscuro revela la nueva paleta de **izquierda a derecha**, con un borde suave, durante **1,5 segundos**. En navegadores sin View Transitions se utiliza un fundido de la misma duración. Neumorfismo utiliza únicamente sombras, sin bordes delineados ni anillos decorativos; Liquid Glass conserva sus contornos. El foco visible del teclado y el formato imprimible de las remisiones se mantienen.

La revisión de capturas del usuario corrigió el recorte de las sombras en navegación y filtros, la posición de la etiqueta Alcance y la alineación de stock/peso en Nuevo ítem. Los controles de stock utilizan un solo hundido y el selector de peso se apila en pantallas estrechas.

## Desarrollo local

Requiere Node.js 22 o superior y pnpm. Instale con `pnpm install --frozen-lockfile`, copie `.env.example` a `.env.local`, configure el proyecto Supabase y ejecute `pnpm dev`. La aplicación consulta el inventario exclusivamente desde Supabase y requiere iniciar sesión.

Configure `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. La clave publicable es pública; jamás coloque una clave secreta, `service_role` ni contraseñas en variables `VITE_`. El nombre anterior `VITE_SUPABASE_ANON_KEY` sigue aceptándose para instalaciones existentes.

## Preparación de Supabase

1. Cree un respaldo verificable del esquema y de los datos existentes. Ejecute `supabase/preflight_readonly.sql` para inspeccionar tablas, políticas, permisos, conteos y el código `EST001`. Ensaye primero en un proyecto de pruebas.
2. En una base nueva, aplique `supabase_schema.sql` y después las migraciones de `supabase/migrations` en este orden: `20261001_secure_inventory.sql`, `20261002_private_item_images.sql`, `20261005_remission_transport.sql`, `20261005000100_unit_weights.sql`, `20261006000100_data_administration.sql`, `20261006000200_archived_inventory.sql`, `20261006000300_outgoing_photos.sql`, `20261006000400_item_locations.sql`, `20261006000500_inventory_values.sql` y `20261006000600_storage_levels_and_brands.sql`. El esquema no incluye artículos de ejemplo. En una base existente, aplique solo las migraciones pendientes después del respaldo. La migración de seguridad se detiene si detecta políticas RLS desconocidas para evitar conservar accesos inesperados.
3. Cree usuarios en Supabase Auth. Asigne `app_metadata.role` desde un entorno administrativo: `admin` gestiona catálogo/ubicaciones y realiza movimientos; `operador` registra entradas y salidas; `consulta` solo lee. Un usuario sin rol queda sin permisos de inventario. No use `user_metadata` para roles.
4. Compruebe las políticas RLS y el bucket privado `item-images` con usuarios de cada rol antes de habilitar la aplicación para el equipo.

La identidad visible utiliza `user_metadata.name` y `user_metadata.cargo`; el correo se conserva para iniciar sesión y `app_metadata.role` determina los permisos. `supabase/configure_warehouse_profile.sql` configura la cuenta administradora única como Andrés Castañeda / Almacenista y corrige sus registros anteriores que conservan la identidad de inicio de sesión. Si hay varias cuentas administradoras, indique su correo en `v_target_email`; el script se detiene sin cambios si la cuenta no es única. Ejecútelo completo en el SQL Editor y cierre e inicie sesión para renovar los datos del perfil. Los datos de otras personas y los permisos se conservan.

Las salidas, movimientos y altas de artículos se hacen mediante funciones SQL transaccionales. Cada salida utiliza un identificador de solicitud para impedir descuentos duplicados. Las fotos nuevas se comprimen antes de subirlas al bucket privado; el catálogo guarda su ruta y genera enlaces de lectura temporales.

La pantalla Entradas registra recepciones sin PDF. Administración de datos → Archivados permite a los administradores eliminar individualmente productos archivados, conservando historial y remisiones. Consulte `docs/entradas-y-archivados.md` para activar y utilizar estas funciones.

Salidas permite tomar o subir fotografías opcionales. Se almacenan en Supabase y se consultan con el botón Fotos del historial, separado del botón PDF. Las fotografías no aparecen en la remisión impresa. Activación y permisos en `docs/registro-fotografico-salidas.md`.

La pantalla inicial muestra un indicador desde el HTML, antes de ejecutar JavaScript. Espera fuentes locales, logo, sesión, datos del inventario y la vista inicial. No oculta la aplicación durante actualizaciones de datos ya cargados. Los errores iniciales ofrecen Reintentar. Las fuentes WOFF2 y sus licencias están en `public/fonts`; los iconos incluyen únicamente los símbolos usados. Si agrega iconos, actualice ese paquete con `node scripts/vendor-fonts.mjs` (requiere conexión). El despliegue y la compilación utilizan los archivos guardados, sin descargar fuentes externas.

## Inventario histórico

El 1 de octubre de 2026 se conciliaron 677 artículos y se cargaron en el proyecto Supabase. Los archivos completos del Excel, JSON y SQL de importación se retiraron del árbol de trabajo después de verificar la carga. No hay productos reales ni ejemplos en el código de la aplicación. Las pruebas de integración usan únicamente datos sintéticos.

El informe resumido `reports/excel-reconciliation.json` conserva únicamente conteos: tres filas recuperadas del Excel, 25 stocks decimales y cinco stocks ilegibles. Estos cinco se cargaron con cantidad 0 y `stock_pendiente=true`, y no se pueden despachar hasta que un administrador confirme su existencia mediante un ajuste de inventario. Los 677 artículos conservan la ubicación descriptiva original en Supabase; estanterías y cajas quedaron nulas para conciliación posterior.

Para revisar la carga sin modificarla, ejecute por separado los bloques de `supabase/postdeploy_readonly.sql` en el Editor SQL de Supabase. El primer bloque resume artículos activos, stocks pendientes y ubicaciones faltantes; el segundo muestra solo los cinco artículos que requieren conteo físico. No guarde esa salida con nombres de productos dentro del repositorio.

Si se necesita repetir una importación en otro proyecto, `scripts/prepare-import.py` y `scripts/audit-import.mjs` permiten reconstruir el SQL a partir de copias privadas externas. Antes de ejecutarlo, respalde la base, revise `supabase/preflight_readonly.sql` y ensaye la carga.

El 6 de octubre se añadió una segunda carga de **867 filas**, conservando cada fila por separado y los **678 elementos existentes**. El usuario ejecutó el respaldo, la importación y la consulta de verificación en Supabase. El resultado fue 867 añadidos, 1.545 totales, cuatro stocks pendientes y once precios pendientes. Las cantidades por las 13 combinaciones de estantería/nivel coinciden exactamente con el Excel: 341 elementos tienen ambas ubicaciones y 526 no las tenían declaradas. Los 867 pertenecen a Almacén Turpial. El usuario confirmó después que todo se ve correcto en la aplicación.

Los archivos de esta segunda importación son privados y locales: `.private_import/20261006_almacen/` está ignorado por Git; `almacén.xlsx` permanece sin versionar. No incorporar el Excel, el respaldo, el SQL generado ni productos reales a commits o al frontend. El servidor de desarrollo deniega estos archivos. La guía de continuidad recoge las decisiones y los datos pendientes sin reproducir el inventario.

La carga efectuada reemplazó los 674 artículos y registros de prueba anteriores dentro de una transacción. Se aplicaron las migraciones de inventario seguro y fotos privadas. La cuenta creada en Supabase Auth tiene rol `admin`; su contraseña y las claves privadas no están en el repositorio.

## Verificación y entrega

Ejecute `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`. Las pruebas de integración usan PostgreSQL embebido mediante PGlite; además se debe verificar la migración en un proyecto Supabase de pruebas, especialmente Auth, Storage y Realtime. `pnpm clean` elimina únicamente la carpeta `dist`.

El resultado de la refactorización, las medidas antes/después y los límites de verificación están en `reports/verification.md`. El plan completo está en `PLAN_REFACTORIZACION.md`.

Publique los archivos de `dist` en un servidor estático con fallback a `index.html`. Configure las variables de entorno de producción durante la compilación y confirme el acceso con usuarios de cada rol después del despliegue.

Si publica en Vercel, agregue `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en **Project Settings → Environment Variables** para el entorno **Production**. Vuelva a desplegar después de guardarlas: Vite incorpora esas variables durante la compilación. Use solo la clave publicable, nunca una clave secreta. Luego inicie sesión en la URL publicada y contraste los artículos con el conteo actual de Supabase; al cerrar la segunda importación se confirmaron 1.545.

Valores en COP: el valor unitario se guarda en `elementos.especificaciones.valor_unitario_cop`. La migración de valores inicializa en cero los precios y documentos anteriores sin valor, conserva los valores ya declarados si se ejecuta otra vez, y captura el precio de cada partida al confirmar la salida. `inventory_project_spending()` suma todas las remisiones del proyecto, sin el límite de 100 documentos de la vista reciente. El dashboard excluye productos archivados y stock pendiente de confirmar; el porcentaje dañado usa el valor de las unidades marcadas como dañadas sobre el valor total de las existencias confirmadas.


Niveles de estantería y marcas: ejecute completo `supabase/migrations/20261006000600_storage_levels_and_brands.sql` en el SQL Editor antes de usar los niveles. Es un único bloque transaccional y conserva los productos, existencias, cajas y documentos. La jerarquía es almacén → estantería → nivel → caja. Administración de datos incorpora Niveles; también pueden crearse desde Almacenes y Nuevo ítem. Los filtros y el formulario de edición incluyen niveles. Cada nivel muestra el valor total y dañado de su contenido. Las cajas existentes siguen sin nivel hasta editar su asignación; sus productos se reubican automáticamente, conservando el stock y registrando el cambio en el historial. Las nuevas cajas requieren un nivel. La marca es opcional, se guarda en `elementos.especificaciones.marca`, se muestra y permite buscar material, y se congela al emitir cada nueva remisión. Las marcas históricas no se deducen del catálogo actual.

La campana permite pulsar el texto de alertas restantes para desplegar todas las alertas en la misma lista con desplazamiento y abrir el detalle de cualquier producto.
