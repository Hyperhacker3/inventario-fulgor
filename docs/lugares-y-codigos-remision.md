# Lugares, códigos y formato de remisión

Actualizado el 7 de octubre de 2026.

Salidas solicita **Lugar de remisión** (origen) y **Lugar de destino**, ambos obligatorios y de hasta 80 caracteres. Son independientes del proyecto y su dirección. Los nombres originales se guardan en la remisión; el código utiliza mayúsculas, elimina tildes y convierte espacios/puntuación en guiones.

Ejemplo: origen Honda, destino Bogotá, fecha de emisión 7 de octubre de 2026 y consecutivo 6 producen **REM-HONDA-BOGOTA-20261007-006**. La fecha usa **AAAAMMDD**, determinada por el servidor en **America/Bogota**, no la fecha opcional de transporte. El consecutivo continúa el conteo anual compartido existente, independientemente de la ruta, sin reiniciarlo por lugar ni por día. Se completa con ceros hasta tres cifras; 1000 y 10000 se conservan completos. La pantalla muestra el formato, pero el consecutivo definitivo se asigna al registrar la salida.

## Activación

Ejecute completo `supabase/migrations/20261007000200_remission_route.sql` en el SQL Editor de su proyecto Supabase **después de las migraciones anteriores**, incluyendo `20261007000100_company_profile.sql`. Finalice los envíos o reintentos pendientes de la versión anterior antes de activar: la nueva versión exige lugares y retira la ejecución directa de las RPC antiguas de salida. Estas RPC siguen funcionando internamente desde la nueva función protegida.

La migración es transaccional y repetible. Añade los lugares, la función `dispatch_inventory_with_route`, la comprobación `remission_route_ready` y protección de los datos emitidos. Conserva documentos anteriores, sus códigos, stocks, partidas, fotografías y referencias históricas. Reconcilia el contador anual y evita truncar el identificador interno después de 9999. Se detiene si encuentra una definición del consecutivo interno distinta de la versión esperada, para permitir revisarla antes de aplicar cambios.

Después de ejecutarla, recargue la web o pulse **Comprobar de nuevo** en Salidas. Antes de activarla, puede consultar inventario y remisiones; el formulario conserva los campos y avisa que la emisión con el formato nuevo todavía necesita la actualización. No genera códigos locales ni registra una salida con el formato antiguo como alternativa.

El SQL se ensayó con PostgreSQL embebido. **No se ejecutó en Supabase real** desde este chat; no hay una sesión administrativa disponible.

## Remisiones y reintentos

La nueva función reutiliza la transacción existente de stock, transporte, fotografías, pesos, precios y empresa. Conserva los identificadores internos de remisiones para sus relaciones históricas; el código visible completo se guarda en `numero_remision` y en el motivo de los movimientos nuevos. Un reintento idéntico devuelve el documento emitido, sin otro descuento ni otro consecutivo. Cambiar lugares, materiales, datos o fotos de una solicitud ya emitida se rechaza.

Los lugares, código y fecha quedan fijos al emitir. Las remisiones anteriores mantienen su código y destino histórico; no se inventa su origen. Los cambios posteriores en el proyecto, peso del producto o empresa no reconstruyen datos de documentos existentes.

## PDF

La hoja A4 empieza arriba, conservando el margen de 9,525 mm y la paginación medida. El NIT permanece debajo del logo, con Arial heredada y 11 px como los datos del encabezado. El encabezado muestra origen, destino y ubicación del proyecto por separado. Los códigos largos se ajustan en varias líneas, también en las tarjetas de Remisiones.

La tabla añade **Peso unitario (kg)** inmediatamente antes de **Peso total (kg)**. Los pesos en gramos se convierten a kilos y se utilizan los valores conservados en cada partida. La descripción mantiene nombre y marca, sin el texto de peso por unidad. Un peso no declarado muestra Pendiente; no se deduce ni se inventa. Se conservan totales, observaciones, transporte, firmas y páginas.

## Verificación

Pasaron typecheck, lint, **148 pruebas unitarias y 32 de integración (180 en total)** y build. Las pruebas cubren campos obligatorios, normalización, fecha de Bogotá, formato, compatibilidad histórica, columnas, alineación, permisos, conservación de snapshots/stock, reintentos, repetición de migración y crecimiento del consecutivo. PostgreSQL embebido no sustituye una prueba concurrente con varias conexiones reales; JSDOM comprueba reglas y eventos, no la geometría del PDF impreso. La revisión visual queda con el usuario; no se utilizó computer use ni automatización de navegador.
