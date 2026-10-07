# Plan de refactorización, optimización y estabilización de EL TURPIAL

Nota de continuidad, 7 de octubre de 2026: este plan conserva el diagnóstico histórico. El estado actual (1.545 elementos al cerrar la segunda importación) y el cambio visual implementado están en `docs/CONTINUIDAD.md` y `docs/estilos-interfaz.md`. Liquid Glass y Neumorfismo ya están aplicados: Neumorfismo predeterminado, botón al final de Ayuda y transiciones de 1,5 segundos para estilo y claro/oscuro. Los campos de una línea comparten 44 px y los botones usan superficies neutras con color de acción en el texto; el vidrio se ajustó a la referencia del usuario. Botones y productos comparten el hover de navegación en PC; toda la fila o tarjeta del inventario abre el detalle, sin subrayado y con acciones internas independientes. Pasaron typecheck, lint, 126 pruebas unitarias, 25 de integración y build. El usuario autorizó hacer push después de cada cambio verificado; la revisión visual sigue pendiente y el estado del despliegue se comprueba por separado.

Fecha: 30 de septiembre de 2026. Estado al 1 de octubre de 2026: migraciones, importación de 677 productos y despliegue completados. Véase `reports/verification.md` para cambios verificados y trabajo pendiente.

El ajuste visual posterior añade un barrido de izquierda a derecha para claro/oscuro, reduce ambos cambios a 1,5 segundos y elimina los bordes delineados de Neumorfismo, conservando sombras y foco de teclado. Liquid Glass mantiene sus contornos. La navegación continúa en 180 ms y las remisiones impresas conservan su formato.

El objetivo es conservar las funciones del producto, reducir el acoplamiento, mejorar el rendimiento y conseguir que inventario, despachos y trazabilidad sean fiables con varios usuarios. El orden de trabajo debe atender primero la seguridad y la integridad; después la optimización medida.

## 1. Diagnóstico y alcance

Mediciones del código fuente actual:

| Archivo | Líneas | Responsabilidades que conviene separar |
| --- | ---: | --- |
| `src/context/InventoryContext.tsx` | 1.095 | Estado de siete entidades, carrito, navegación, modales, caché local, lectura y escritura remota, Realtime, mapeos y reglas de stock |
| `src/components/WarehouseView.tsx` | 816 | Árbol de ubicaciones, estadísticas, selección y seis formularios de alta/edición |
| `src/components/ItemDetailModal.tsx` | 600 | Consulta, edición, imagen, estado del material, eliminación e historial |
| `src/components/NewItemView.tsx` | 592 | Formulario, ubicación, validación, imagen y confirmación |
| `src/components/ExplorerView.tsx` | 562 | Filtros, búsqueda, tarjetas, tabla y acciones |
| `src/data/initialData.ts` | 512 | Datos de demostración de varias entidades |
| `src/components/DispatchView.tsx` | 447 | Selección de material, carrito, validaciones, destinatario y confirmación |

El tamaño del código fuente es una señal de mantenimiento; no permite inferir por sí solo el peso del JavaScript descargado ni la velocidad de la aplicación. Esos valores deben medirse en una compilación de producción.

Problemas de rendimiento observables en el código:

- Un contexto único publica datos, funciones y estado visual en un objeto nuevo. Sus consumidores reciben cambios aunque no necesiten el campo modificado.
- Las funciones de consulta de ubicaciones se recrean en cada renderizado y participan en dependencias de `useMemo`.
- La pantalla de almacenes vuelve a recorrer estanterías, cajas y elementos dentro de otros recorridos.
- Cada evento de elementos, remisiones o historial dispara consultas de seis tablas completas. Un despacho puede producir varios eventos.
- Se serializan colecciones completas en `localStorage`, incluidas fotografías en base64.
- Inventario y remisiones pueden renderizar todos los resultados; el historial pagina después de descargar los registros.
- Todas las vistas y los modales principales se importan al inicio.
- Las lecturas tienen límites fijos y no garantizan obtener todo el inventario remoto.

Problemas funcionales incluidos en este plan:

- Acceso público según el SQL incluido; usuario fijo sin autenticación.
- Despachos sin transacción, consecutivos calculados en el navegador y efectos laterales dentro de actualizadores de React.
- IDs reinterpretados al leer Supabase; relaciones y datos de auditoría perdidos.
- Errores remotos no comunicados correctamente y altas locales sin persistencia remota.
- Datos de demostración mezclables con datos operativos.
- Importación real pendiente y documentación/configuración desactualizadas.

La conciliación final del Excel tiene 677 registros con códigos únicos. Recuperó tres filas omitidas por el JSON anterior, preservó 25 cantidades decimales y marcó cinco stocks ilegibles con cantidad 0 pendiente de confirmación. Incluye CONTROLADORES, ACCESORIOS, HERRAMIENTAS y SEGURIDAD_EPP. Usa UND, KL, KG, CAJA, COSTALES, JUEGO y PARES; no se debe interpretar KL sin revisar el origen. Los 677 registros tienen estantería y caja nulas: hay que preservar esa ausencia de asignación.

## 2. Arquitectura de destino

Flujo principal: vista → hook de la funcionalidad → servicio de aplicación/repositorio → Supabase. Las validaciones y transformaciones puras viven en el dominio. Los cambios críticos de stock se resuelven mediante funciones SQL transaccionales.

Separación del estado:

- **Datos remotos:** consultas y mutaciones específicas con TanStack Query, claves por entidad/filtros/página y una caché de sesión común.
- **Carrito:** contexto y reducer propios. Cada fila guarda `elementoId` y cantidad; los datos vigentes se consultan por ID.
- **Interfaz:** contextos pequeños para navegación, búsqueda y selección de modales. Los formularios conservan estado local.
- **Sesión:** proveedor de autenticación separado. Al cambiar de usuario se limpian o segmentan consultas, borradores y cachés.
- **Demostración:** deshabilitada. El inventario se consulta exclusivamente desde Supabase; las pruebas usan datos sintéticos.

TanStack Query se propone para eliminar la implementación manual de caché, estados de consulta e invalidación. No se añade otro gestor global inicialmente. React sigue gestionando el estado visual y del carrito.

Estructura orientativa; crear módulos cuando se migre su responsabilidad, sin generar archivos vacíos:

```text
src/
  app/
    App.tsx
    AppProviders.tsx
    MainLayout.tsx
    navigation.ts
  domain/
    inventory.types.ts
    inventory.validation.ts
    location.types.ts
    dispatch.types.ts
    dispatch.validation.ts
    movement.types.ts
    catalogs.ts
  data/
    supabase/
      client.ts
      database.types.ts
      inventory.repository.ts
      locations.repository.ts
      projects.repository.ts
      dispatch.repository.ts
      history.repository.ts
      mappers/
    demo/
    migrations/
  features/
    auth/
    inventory/
      components/
      hooks/
    warehouses/
      components/
      hooks/
    dispatch/
      components/
      hooks/
    history/
    remissions/
  shared/
    components/
      Modal.tsx
      FormField.tsx
      Pagination.tsx
      AsyncState.tsx
      ImagePicker.tsx
    hooks/
      useCamera.ts
    lib/
      dates.ts
      csv.ts
      errors.ts
      imageProcessing.ts
  state/
    ui/
    cart/
scripts/
  inventory-import/
supabase/
  migrations/
tests/
  integration/
  e2e/
```

Las migraciones SQL definitivas se centralizarán en `supabase/migrations/`; `src/data/migrations/` se reserva a migraciones de formatos locales del navegador. No habrá dos esquemas SQL editados manualmente. Si la guía necesita ofrecer SQL, se generará desde una fuente versionada apta para instalación y sin datos operativos.

Límites orientativos de mantenimiento:

- Vistas contenedoras: 100–200 líneas; componentes y hooks: 80–250.
- Revisar archivos por encima de 300 líneas y funciones por encima de 60; permitir excepciones justificadas.
- Separar por responsabilidad, no para cumplir un número artificial.
- Evitar reemplazar `InventoryContext` por un hook igualmente grande.
- Las vistas no hacen llamadas directas a Supabase ni escrituras de caché.
- Reglas de negocio, repositorios y formatos compartidos no dependen de componentes React.

## 3. Fases de implementación

### Fase 0 — Entorno reproducible y medición inicial

Trabajo:

1. Elegir un gestor de paquetes y fijar su versión, teniendo en cuenta el `bun.lock` existente. Mantener un único archivo de bloqueo.
2. Instalar las dependencias y comprobar compilación y tipos antes de atribuir fallos a la refactorización.
3. Separar scripts `typecheck`, `lint`, `test`, `test:integration`, `test:e2e` y `build`; el actual `lint` solo comprueba TypeScript.
4. Configurar lint para hooks, imports y uso de `any`. Introducir tipado estricto por módulos migrados antes de activarlo en todo el proyecto.
5. Preparar un entorno Supabase de pruebas independiente y un conjunto reproducible de datos anonimizados.
6. Medir bundle inicial/comprimido, solicitudes al abrir y despachar, duración de renderizado, latencia de búsqueda y ocupación de almacenamiento local.
7. Usar conjuntos de 677 y 5.000 elementos, y 10.000 movimientos de historial para comparar los mismos escenarios.

Entregables: comandos reproducibles, registro de línea base y escenarios de regresión.

Criterio de cierre: aplicación compilable, fallos existentes identificados, entorno de pruebas separado y métricas comparables. No presentar mejoras porcentuales antes de medir.

### Fase 1 — Seguridad, sesión y preparación de migraciones

Trabajo:

1. Leer el esquema realmente desplegado, sus permisos y sus políticas; el SQL del repositorio no prueba el estado remoto.
2. Obtener respaldo y verificar restauración en pruebas antes de tocar datos reales.
3. Incorporar Supabase Auth con cuentas de personal autorizado; impedir registro público por defecto.
4. Proponer tres roles iniciales: administración, operación de bodega y consulta. Aplicar permisos en base de datos, no solo ocultar botones.
5. Reemplazar las políticas públicas por políticas acotadas al usuario/rol. Almacenar roles en datos protegidos, no en campos que el usuario pueda editar.
6. Revisar permisos de ejecución de RPC y de Storage; impedir actualizaciones directas que eludan la validación de stock.
7. Quitar credenciales por defecto del cliente. Validar variables de entorno y mostrar configuración incompleta cuando corresponda.
8. Mantener claves de servicio exclusivamente en herramientas de servidor/importación, nunca en Vite.
9. Sustituir el perfil fijo por la sesión real y registrar al actor autenticado en cada movimiento.

Entregables: sesión, matriz de permisos, migraciones de seguridad y variables documentadas.

Criterio de cierre: un cliente anónimo no accede a datos operativos; consulta no puede escribir; el operador solo ejecuta acciones autorizadas. La migración se ensaya y se coordina con una versión compatible del frontend para evitar un bloqueo accidental.

### Fase 2 — Modelo de datos e identificadores estables

Trabajo:

1. Conservar inicialmente los IDs TEXT existentes como cadenas exactas, evitando una migración innecesaria a UUID. Generar los nuevos IDs de manera única en el servidor.
2. Cambiar `id`, referencias y claves del carrito a un tipo común `string`; eliminar extracción de dígitos, coincidencias parciales y reconstrucción de IDs a partir de códigos.
3. Tipar filas de base de datos y crear mappers explícitos que preserven referencias y valores cero.
4. Representar ubicaciones opcionales como `null`; validar que caja → estantería → almacén pertenezcan a la misma jerarquía.
5. Unificar categorías y unidades en catálogos compartidos; revisar KL antes de convertirla. Admitir unidades documentadas sin equivalencias inventadas.
6. Guardar estado y material dañado consistentemente. Validar stock no negativo y cantidad dañada dentro del total.
7. Decidir cantidad entera o decimal por unidad. Si se admiten metros/kilogramos fraccionarios, migrar stock y movimientos a `NUMERIC` con precisión definida.
8. Registrar fechas en timestamps de base de datos; formatear para Colombia en la interfaz. Preservar las fechas históricas originales si no se pueden convertir con certeza.
9. Añadir campos de auditoría reales: stock anterior/nuevo, actor, proyecto, remisión y ubicaciones de origen/destino cuando apliquen.
10. Detectar inconsistencias existentes y producir un informe de reparación; no completar valores históricos desconocidos con números ficticios.

Entregables: tipos, mappers, catálogo y migraciones de datos/esquema.

Criterio de cierre: guardar → recargar → consultar preserva IDs, referencias, cero, nulos y auditoría; ningún registro real se oculta por categorías no reconocidas.

### Fase 3 — Stock y despachos transaccionales

Trabajo:

1. Corregir inmediatamente el efecto lateral del actualizador de React: calcular resultados mediante funciones puras, fuera de `setElementos`.
2. Crear `process_dispatch` en PostgreSQL para validar permisos, proyecto, cantidades y disponibilidad; bloquear los elementos afectados en orden estable.
3. En una sola transacción: asignar consecutivo, crear remisión y detalles, descontar stock e insertar movimientos. Toda la operación falla o toda se confirma.
4. Usar consecutivo anual generado en la base de datos con restricción única, sin depender del tamaño de la lista del navegador.
5. Incorporar una clave de idempotencia para que repetir la misma solicitud tras un corte de red no duplique el despacho. Un intento con contenido diferente no reutiliza esa clave.
6. Crear operaciones transaccionales para entradas, ajustes y reubicaciones; impedir modificaciones de stock fuera de esos caminos.
7. Validar las cantidades dañadas frente al stock resultante y definir stock utilizable como total menos dañado para los despachos.
8. Mostrar confirmación y documento definitivo solo tras respuesta válida. Deshabilitar el envío mientras esté pendiente y conservar el borrador si falla.
9. Archivar elementos referenciados cuando corresponda, preservando los snapshots de remisiones y movimientos; revisar la eliminación definitiva como operación de administración.

Entregables: RPC, validadores puros y hook de despacho con estados pendiente/error/confirmado.

Criterio de cierre: con stock 10, dos despachos simultáneos de 8 producen un éxito y un rechazo; repetir una solicitud devuelve el mismo resultado; un fallo de inserción no deja stock parcialmente descontado.

### Fase 4 — Repositorios, persistencia completa y sincronización

Trabajo:

1. Extraer repositorios por inventario, ubicaciones, proyectos, historial y remisiones. Convertir operaciones remotas a APIs asíncronas con errores tipados.
2. Completar altas y ediciones de todas las entidades. Comprobar filas afectadas: una respuesta sin error pero sin actualización no cuenta como éxito.
3. Incorporar consultas con selección de columnas, orden estable y paginación; quitar descargas completas y límites fijos como mecanismo de carga.
4. Integrar TanStack Query con claves que incluyan sesión, filtros y página. Cargar detalle e historial del elemento al abrirlo.
5. Invalidar únicamente consultas afectadas por una mutación. En Realtime, agrupar eventos próximos y evitar otra invalidación duplicada por el evento de la propia operación.
6. Actualizar por ID el caché cuando sea seguro; para listas filtradas o agregados, invalidar solo las claves relevantes. Ante reconexión, reconciliar con el servidor.
7. Suscribirse a entidades necesarias, limpiar canales al salir/cambiar de sesión y proteger la caché frente a respuestas obsoletas.
8. Diferenciar estados de configuración, carga, datos desactualizados, escritura pendiente, error y desconexión. Comprobar `error` en cada lectura y escritura.
9. Tratar una respuesta vacía válida como lista vacía, sin sustituirla por ejemplos ni mantener filas eliminadas.
10. Establecer Supabase como fuente operativa. Sin conexión se permite consultar caché y editar borradores; confirmar stock/despachos requiere conexión. La demostración local es un modo explícito independiente.
11. Migrar formatos locales antiguos con versión y conservar una copia exportable antes de retirar datos. No reenviar cambios locales antiguos a la nube automáticamente.

Entregables: repositorios, hooks específicos, caché de consultas y estados visibles.

Criterio de cierre: altas y cambios persisten después de recargar y en una segunda sesión; fallos se comunican; datos vacíos funcionan; un evento no dispara la recarga de todas las tablas.

La cola de operaciones offline sobre stock queda como ampliación futura: necesita reconciliación e idempotencia propias. No se promete confirmar un despacho sin conexión.

### Fase 5 — Dividir contexto y componentes

Trabajo:

1. Introducir los nuevos proveedores y hooks detrás de un adaptador temporal para migrar una funcionalidad a la vez.
2. Sacar navegación, modales, carrito y sesión del contexto de entidades. Guardar solo IDs para los detalles seleccionados.
3. Migrar consumidores a consultas específicas y eliminar el adaptador una vez terminada la transición.
4. Reutilizar validación, búsqueda, ubicación, estados de stock, formatos y selector de imágenes sin mezclar funciones de productos distintos.
5. Crear un modal accesible compartido con Escape, foco inicial, retención/restauración de foco y scroll controlado.

Descomposición concreta:

| Archivo actual | Componentes/módulos propuestos |
| --- | --- |
| `InventoryContext` | Repositorios, mappers, consultas/mutaciones, estado UI, reducer del carrito, validaciones y caché local versionada |
| `WarehouseView` | `WarehouseList`, `WarehouseSummary`, `RackList`, `RackCard`, `BoxCard`, formularios por entidad y hook de selección |
| `ItemDetailModal` | `ItemSummary`, `ItemEditForm`, `ItemCondition`, `ItemHistory`, `ImagePicker` y acciones de archivo |
| `NewItemView` | `ItemForm`, campos de ubicación/cantidad, catálogo, imagen y validación compartida con edición |
| `ExplorerView` | `InventoryFilters`, `InventoryGrid`, `InventoryTable`, `ItemCard` y consulta paginada |
| `DispatchView` | `AvailableInventory`, `DispatchCart`, `DispatchCartRow`, `DispatchRecipientForm` y `useDispatch` |
| `CameraCaptureModal` | `useCamera`, captura/selección y modal compartido |
| `PdfRemissionModal` | Documento de remisión, controles de vista y estilos de impresión |
| `initialData` | Ejemplos por entidad, cargados solo en demostración/pruebas |

Al extraer cámara, revisar la limpieza del stream mediante una referencia vigente: detener tracks al cerrar, desmontar o cambiar cámara, incluida la llegada tardía de una solicitud de permisos.

Entregables: módulos por funcionalidad y retiro del contexto monolítico.

Criterio de cierre: cada vista coordina sus componentes sin hacer persistencia; abrir un modal no obliga a actualizar todas las vistas de inventario; las responsabilidades son localizables sin seguir un archivo de mil líneas.

### Fase 6 — Rendimiento de consultas y renderizado

Trabajo:

1. Crear índices memoizados por ID para entidades cargadas y agrupaciones por almacén, estantería y caja. Reutilizarlos en contadores/ubicaciones para evitar recorridos anidados.
2. Utilizar paginación de 25–50 filas en inventario, remisiones e historial; mantener filtros, orden y exportaciones coherentes con todo el resultado, no solo la página visible.
3. Mover filtros grandes y búsquedas al servidor con orden estable. Añadir espera breve a búsquedas remotas y cancelar/ignorar respuestas superadas.
4. Obtener resúmenes y alertas mediante consultas agregadas autorizadas; no descargar todas las fotos y descripciones para calcular un contador.
5. Revisar planes de consulta con `EXPLAIN` en pruebas. Evaluar índices de claves foráneas, historial por elemento/fecha, remisiones por fecha e inventario por filtros frecuentes. Añadir solo los justificados por las consultas reales.
6. Usar `React.lazy` y `Suspense` para vistas y cámara/documentos que aún no se necesitan; importar confetti al confirmar un despacho.
7. Estabilizar callbacks y resultados derivados cuando permita evitar cálculos medidos. Aplicar `memo` a filas/tarjetas con props estables cuando el profiler muestre beneficio.
8. Considerar virtualización únicamente si una lista sin paginación resulta necesaria y sigue siendo costosa.
9. Mantener una única caché operativa. Reservar `localStorage` para preferencias y borradores pequeños; usar IndexedDB si se necesita persistir caché o imágenes pendientes de mayor tamaño.

Entregables: consultas paginadas, índices necesarios, carga diferida y comparación contra línea base.

Objetivos de aceptación iniciales, a verificar en el dispositivo/perfil fijado en fase 0:

- Cambiar búsqueda o selección de modal no provoca una nueva consulta de todas las entidades.
- Inventario e historial montan una página de resultados, no miles de filas ocultas.
- La respuesta local del campo de búsqueda permanece por debajo de 100 ms en el percentil 95 del escenario de prueba; medir la respuesta remota por separado.
- Reducir al menos 50% las solicitudes asociadas a un despacho respecto a la línea base, manteniendo coherencia entre sesiones.
- Registrar el peso inicial comprimido y exigir que cámara, ayuda y documento diferidos no formen parte del bundle inicial. Fijar el presupuesto final tras medir dependencias reales.
- No introducir regresiones en accesibilidad, impresión ni tiempos de confirmación.

### Fase 7 — Imágenes, formularios e impresión

Trabajo:

1. Validar tamaño y tipo de las imágenes; redimensionar/comprimir antes de subirlas y generar miniaturas para las listas.
2. Guardar imágenes en Supabase Storage con políticas compatibles con la sesión y registrar la ruta del objeto, evitando base64 dentro de la colección de inventario.
3. Gestionar previews con URLs temporales y liberar recursos. Implementar limpieza controlada de objetos huérfanos y recuperación de cargas fallidas.
4. Aplicar carga diferida, dimensiones definidas y miniaturas en tarjetas; cargar la foto completa solo en detalle.
5. Unificar reglas de formularios: códigos únicos, campos obligatorios, ceros válidos, cantidades finitas, jerarquía correcta y estado dañado consistente.
6. Separar el documento imprimible del resto de la aplicación. Quitar transformaciones de zoom al imprimir y controlar márgenes, saltos, encabezados y firmas.
7. Verificar remisiones de 1, 20 y 100 renglones; reemplazar el pie fijo «Página 1 de 1» si hay varias páginas.
8. Mantener el guardado como PDF mediante impresión del navegador inicialmente; no añadir otra biblioteca sin necesidad del producto.
9. Revisar CSV: UTF-8, comillas, saltos de línea, caracteres de URL y mitigación de fórmulas en texto exportado. Generar descargas mediante Blob.

Entregables: flujo único de imágenes/formularios y documento imprimible independiente.

Criterio de cierre: subir fotos no serializa todo el inventario en base64; abrir/editar diferentes elementos no reutiliza datos de formulario anteriores; impresión y exportación conservan todos los registros esperados.

### Fase 8 — Importación del inventario real y limpieza del proyecto

Trabajo:

1. Crear importador con modo de validación sin escritura para Excel/JSON. Después de verificar la carga, retirar los archivos completos del proyecto y de la rama Git; el inventario operativo queda en Supabase.
2. Generar informe de códigos, categorías, unidades, cantidades, stock mínimo, material dañado y ubicaciones pendientes de resolver.
3. Revisar las diferencias entre ubicaciones descriptivas del JSON y el árbol real; mantener `null` hasta asignar una ubicación válida.
4. Reconciliar registros ya presentes por código sin sobrescribir stock operativo silenciosamente. Tratar diferencias como conciliaciones autorizadas con trazabilidad.
5. Importar primero en pruebas, verificar 677 registros, cinco stocks pendientes y 25 decimales. Evitar repetir la importación como nuevas entradas.
6. No incluir datos de ejemplo en producción, quitar el carrito precargado y usar únicamente datos sintéticos en las pruebas.
7. Retirar dependencias sin uso comprobado; revisar Gemini, Express, html2canvas, jsPDF, motion y lucide-react. Eliminar también tipos/configuración asociados cuando corresponda.
8. Unificar la declaración duplicada de Vite, corregir el nombre del paquete y sustituir el script de limpieza por una opción compatible con Windows.
9. Actualizar README, `.env.example`, comandos, instalación del esquema, roles, respaldo, importación y despliegue.

Entregables: importador verificable, inventario reconciliado, manifiesto limpio y documentación real.

Criterio de cierre: importación repetible sin duplicación, todas las categorías visibles y ninguna instrucción de configuración requiere Gemini si no se utiliza.

### Fase 9 — Verificación integral y entrega

Trabajo:

1. Pruebas unitarias centradas en validaciones y mapeos: cero, nulos, cantidades inválidas, ID estable y referencias.
2. Pruebas de integración con Supabase/PostgreSQL de pruebas: permisos, stock concurrente, rollback, consecutivos, idempotencia y persistencia de CRUD.
3. Pruebas de UI de carga, vacío, error, sesión y formularios; evitar tests que solo reproduzcan cada componente.
4. Pruebas de extremo a extremo: ingreso, alta, entrada, ajuste, despacho, remisión, recarga y consulta desde otra sesión.
5. Regresiones específicas: StrictMode no duplica movimientos; desconexión conserva borrador y no confirma; respuesta tardía no pisa filtros nuevos; cambios de sesión no exponen caché anterior.
6. Revisar teclado/móvil, ciclo de cámara, PDF de varias páginas y exportación con caracteres especiales.
7. Ejecutar tipos, lint, pruebas y build en CI; verificar instalación reproducible mediante el lockfile elegido.
8. Comparar métricas de producción con la línea base y registrar los resultados y límites del entorno.
9. Preparar el despliegue con migraciones ensayadas, revisión de datos y respaldo. Publicación y cambios remotos se ejecutan como un paso posterior a la revisión de la implementación.

Entregables: informe de pruebas, medidas antes/después, documentación y procedimiento de entrega/restauración.

Criterio de cierre: los escenarios críticos pasan y se cumplen los presupuestos fijados; no quedan errores de sincronización silenciosos ni operaciones de stock fuera de la transacción.

## 4. Orden de entregas revisables

1. Entorno, diagnóstico reproducible y pruebas que detectan los fallos críticos actuales.
2. Corrección del actualizador impuro, cliente configurable, tipos/mappers estables y separación inicial de acceso a datos.
3. Autenticación, permisos y modelo SQL compatible, ensayados en pruebas.
4. Operaciones transaccionales de stock/despacho, consecutivos e idempotencia.
5. CRUD completo, caché de consultas, política offline y Realtime acotado.
6. Contextos separados y descomposición de almacenes/inventario/formularios.
7. Descomposición de despacho/documento/cámara y optimización medida.
8. Importación validada, limpieza y documentación.
9. Validación conjunta y preparación del despliegue.

Las fases describen áreas de trabajo; algunas tareas se adelantan para permitir una entrega coherente. Por ejemplo, los mappers se extraen antes de cambiar todos los componentes y los permisos se coordinan con las RPC. Cada entrega conserva una aplicación usable y un punto de recuperación.

## 5. Decisiones iniciales y alcance de la ejecución

- Mantener React, Vite y Supabase. La revisión no justifica cambiar de framework.
- Conservar el diseño visual y la navegación actuales salvo estados de carga/error/sesión necesarios.
- Conservar IDs TEXT actuales y generar los nuevos en el servidor.
- Usar TanStack Query para datos remotos; contextos pequeños y reducers para UI/carrito.
- Confirmación de stock solo conectada; consulta/borradores disponibles con caché.
- Límites de tamaño como guía de responsabilidad, sin fragmentación artificial.
- Verificar políticas, datos e importación contra la base real antes de migrar producción.
- Confirmar significado de KL, reglas de cantidades/unidades y asignación de ubicaciones cuando no pueda resolverse con el Excel y los datos existentes. Esto no bloquea la separación de módulos.

El plan cubre código, base de datos y despliegue. Se aplicaron las migraciones y la importación real a Supabase; la aplicación está publicada y el usuario confirmó el acceso al inventario. Siguen pendientes la validación manual de los cinco stocks, la conciliación de ubicaciones, las pruebas con varios roles y sesiones, la revisión visual de cámara e impresión y las métricas de rendimiento en uso real.

## 6. Referencias técnicas

- React: propagación de cambios de contexto: https://react.dev/reference/react/useContext
- React: pureza de actualizadores y StrictMode: https://react.dev/reference/react/useState
- React: carga diferida de componentes: https://react.dev/reference/react/lazy
- TanStack Query: invalidación dirigida: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
- Supabase: RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase: funciones de base de datos: https://supabase.com/docs/guides/database/functions
- Supabase: índices y planes de consulta: https://supabase.com/docs/guides/database/postgres/indexes
- Supabase: subida de objetos: https://supabase.com/docs/guides/storage/uploads/standard-uploads
