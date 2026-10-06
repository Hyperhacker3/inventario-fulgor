# Inventario turpial

Aplicación de inventario fotovoltaico con React, TypeScript, Vite y Supabase. Incluye almacenes, catálogo, entradas, salidas, remisiones, administración de datos e historial.

## Desarrollo local

Requiere Node.js 22 o superior y pnpm. Instale con `pnpm install --frozen-lockfile`, copie `.env.example` a `.env.local`, configure el proyecto Supabase y ejecute `pnpm dev`. La aplicación consulta el inventario exclusivamente desde Supabase y requiere iniciar sesión.

Configure `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. La clave publicable es pública; jamás coloque una clave secreta, `service_role` ni contraseñas en variables `VITE_`. El nombre anterior `VITE_SUPABASE_ANON_KEY` sigue aceptándose para instalaciones existentes.

## Preparación de Supabase

1. Cree un respaldo verificable del esquema y de los datos existentes. Ejecute `supabase/preflight_readonly.sql` para inspeccionar tablas, políticas, permisos, conteos y el código `EST001`. Ensaye primero en un proyecto de pruebas.
2. En una base nueva, aplique `supabase_schema.sql` y después las migraciones de `supabase/migrations` en este orden: `20261001_secure_inventory.sql`, `20261002_private_item_images.sql`, `20261005_remission_transport.sql`, `20261005000100_unit_weights.sql`, `20261006000100_data_administration.sql`, `20261006000200_archived_inventory.sql`, `20261006000300_outgoing_photos.sql`, `20261006000400_item_locations.sql` y `20261006000500_inventory_values.sql`. El esquema no incluye artículos de ejemplo. En una base existente, aplique solo las migraciones pendientes después del respaldo. La migración de seguridad se detiene si detecta políticas RLS desconocidas para evitar conservar accesos inesperados.
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

La carga efectuada reemplazó los 674 artículos y registros de prueba anteriores dentro de una transacción. Se aplicaron las migraciones de inventario seguro y fotos privadas. La cuenta creada en Supabase Auth tiene rol `admin`; su contraseña y las claves privadas no están en el repositorio.

## Verificación y entrega

Ejecute `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`. Las pruebas de integración usan PostgreSQL embebido mediante PGlite; además se debe verificar la migración en un proyecto Supabase de pruebas, especialmente Auth, Storage y Realtime. `pnpm clean` elimina únicamente la carpeta `dist`.

El resultado de la refactorización, las medidas antes/después y los límites de verificación están en `reports/verification.md`. El plan completo está en `PLAN_REFACTORIZACION.md`.

Publique los archivos de `dist` en un servidor estático con fallback a `index.html`. Configure las variables de entorno de producción durante la compilación y confirme el acceso con usuarios de cada rol después del despliegue.

Si publica en Vercel, agregue `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en **Project Settings → Environment Variables** para el entorno **Production**. Vuelva a desplegar después de guardarlas: Vite incorpora esas variables durante la compilación. Use solo la clave publicable, nunca una clave secreta. Luego inicie sesión en la URL publicada y verifique que aparecen los 677 artículos de Supabase.

Valores en COP: el valor unitario se guarda en `elementos.especificaciones.valor_unitario_cop`. La migración de valores inicializa en cero los precios y documentos anteriores sin valor, conserva los valores ya declarados si se ejecuta otra vez, y captura el precio de cada partida al confirmar la salida. `inventory_project_spending()` suma todas las remisiones del proyecto, sin el límite de 100 documentos de la vista reciente. El dashboard excluye productos archivados y stock pendiente de confirmar; el porcentaje dañado usa el valor de las unidades marcadas como dañadas sobre el valor total de las existencias confirmadas.
