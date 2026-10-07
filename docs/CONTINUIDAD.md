# Continuidad de Inventario EL TURPIAL

Actualizado: **7 de octubre de 2026**, zona horaria America/Bogota.

Este documento resume el estado para continuar en otro chat. Las secciones anteriores de `reports/verification.md` y `PLAN_REFACTORIZACION.md` son registros históricos; sus conteos y pendientes no sustituyen este estado actual.

## Formularios e inventario simplificado

Última revisión: Almacenes se integra como pestaña de Administración de datos, situada antes de Estanterías/Niveles/Cajas, también en el selector compacto. `WarehousesManager.tsx` sustituye `WarehouseView.tsx` sin otro contenedor de página; conserva selección, alta/edición, árbol, acciones de ubicaciones, productos clicables y valores. Se elimina el acceso lateral/móvil. La ruta heredada `warehouses` y Ver almacenes del Dashboard son alias a `DataAdministrationView initialTab="warehouses"`; Administración queda activa en navegación, sin vista independiente. Permisos y escrituras existentes se conservan. El selector de almacén comparte reposo plano y selección hundida. La navegación de Administración distribuye nueve secciones en tres columnas o nueve desde xl. `ItemPhotoPicker` sustituye el legend que sobresalía por un h3 interno, con ID único y aria-labelledby en el fieldset; conserva fotos, cámara y bloqueo de controles. No requiere SQL. Verificación: typecheck, lint, 163 unitarias + 34 de integración (197) y build; revisión visual con el usuario.

Ajuste de Remisiones: Ver / Imprimir PDF pasa a un icono azul de 44 × 44 px en la esquina superior derecha, junto al código rojo, con nombre accesible que incluye la remisión y tooltip. La cabecera reserva su columna y permite envolver códigos largos sin desplazar el botón a otra fila. Se retira el pie inferior; resumen de materiales y PDF completo se conservan.

Último cambio: Entradas integra el formulario completo de alta que antes tenía Nuevo ítem, bajo su buscador. Se elimina el acceso/vista independiente y Agregar nuevo ítem; `#/new-item` se interpreta como Entradas para enlaces guardados. Sin selección, administración dispone de códigos/categorías, estado, ubicación/creación, fotos, stock inicial, peso y valor. Al seleccionar un producto se muestran sus datos sin editarlos y se registra recepción mediante la transacción existente (cantidad, motivo y responsable); Quitar selección devuelve el formulario de alta. Operadores conservan recepción sin altas. Búsqueda/selección se bloquean durante operaciones pendientes, errores conservan borradores/solicitudes y éxito vuelve al inicio. `ItemRegistrationForm.tsx` reemplaza `NewItemView.tsx`; no se requieren cambios SQL. La X se coloca dentro del cuadro de fotografía, con inset mayor que el padding del contenido y scrollbar fino, manteniéndose fuera del scroll. Remisiones reemplaza listado y total de unidades por «Materiales de salida: N»; cabecera y PDF completo se conservan. Verificación: typecheck, lint, 163 unitarias + 34 de integración (197) y build; revisión visual con el usuario.

Última revisión: la ficha cierra al hacer clic/tocar sobre su fondo exterior, sin cerrar por clics internos ni selectores desplegados en portal. X, Escape y fondo respetan guardados, fotos y creación de ubicaciones pendientes. Editar usa los selectores compartidos de Nuevo ítem para crear estantería, nivel y caja, con IDs únicos, catálogo recién creado disponible inmediatamente, borradores ante errores y bloqueo de Guardar hasta completar la creación. Cajas antiguas sin nivel siguen seleccionables; cajas nuevas requieren nivel. Cancelar descarta la edición del producto, aunque las ubicaciones ya creadas permanecen en el catálogo. El icono Editar pasa a SVG para resolver el texto EDIT en móviles con fuentes en caché. Sidebar/menú móvil comparten colores por función, incluidos entrada verde y salida roja, con variantes claro/oscuro. Se retiran Administrar proyectos y datos de Salidas y Administrar códigos y categorías de Nuevo ítem. No requiere SQL nuevo. Pasaron typecheck, lint, 160 unitarias + 34 de integración (194) y build; geometría real se revisa con el usuario.

Última revisión de ficha: se retiran header/footer de `ItemDetailContent`. La X es un único botón absoluto sobre el panel, fuera del scroll, visible sobre la foto y al bajar en móvil/tablet/PC. Código/categoría pasan a un `dl` junto con marca, estado, ubicación completa, peso, valor y comentarios; estos últimos conservan el texto original sin interpretar descripciones históricas. Datos en una columna bajo 400 px y dos desde ese ancho, con ubicación/comentarios completos. Stock/Disponible/Dañado usan 24/30 px. Las cinco acciones pasan a iconos azul/verde/amarillo/rojo/rojo en una sola fila flexible, manteniendo aria-label/title, permisos, deshabilitado y confirmación de archivo. Guardar/Cancelar quedan dentro del formulario, sin barra inferior. Navegación inferior usa solo iconos: Inicio azul, Inventario violeta, Entradas verde, Salidas rojo, con selección e insignias existentes. Se actualiza la fuente local para incluir `edit`; no requiere SQL.

Último cambio: Inventario ordena por `updated_at` descendente y desempata por ID ascendente en carga y antes de paginar en el explorador. La ordenación copia el arreglo y sigue actualizaciones de caché/Realtime, entradas, salidas y ediciones; creación se usa como alternativa si falta una fecha válida. No necesita SQL nuevo: los flujos existentes ya actualizan la fecha. Nombres reservan dos líneas con elipsis en lista/cuadrícula, manteniendo el texto completo en ficha, título y nombre accesible. Bajo 640 px, lista usa ancho fijo al contenedor y muestra nombre, stock/unidad y salida; oculta código/foto, recuperados desde tablet. Cuadrícula también oculta código en móvil. Buscadores retiran Buscar/Limpiar; Enter sigue abriendo Inventario desde cabecera/menú y Limpiar filtros se conserva. Se añaden dos pruebas de orden, desempates y actualizaciones antes de paginar; revisión de geometría con el usuario, sin navegador automatizado.

La ubicación resumida de Inventario muestra solo el nombre del almacén en lista y cuadrícula, sin estantería/nivel/caja, para evitar que la jerarquía aumente la altura de las filas. La columna se llama Almacén; sin asignación se muestra Sin almacén asignado. Se consulta directamente el almacén por ID, conservando ubicación completa en ficha y filtros, sin modificar los datos ni requerir SQL.

Ajuste anterior: en cuadrícula, Agregar a la salida se superpone a la esquina inferior derecha de la fotografía, con icono rojo y zona táctil de 44 px. Se elimina la fila inferior que ocupaba, conservando unidades arriba a la derecha y contador de fotos abajo a la izquierda. Lista mantiene su acción en la columna existente. Conserva permisos, deshabilitado sin disponibilidad y clic independiente de abrir la ficha; no requiere SQL. Se verifican typecheck, lint, 188 pruebas existentes y build; geometría real queda para revisión del usuario.

La corrección anterior resuelve Nivel duplicado (colisión de claves React vacías de Nivel/Caja), añade scroll al campo/mensaje de error en Nuevo ítem, Entradas y Salidas, y vuelve al inicio tras una escritura confirmada. `useFormScroll` cubre validación nativa, selectores personalizados y alertas en línea, conserva borradores y respeta movimiento reducido/cierre. Inventario enfatiza nombres en mayúsculas, 16/18 px, negrita y hasta dos líneas con elipsis; lista conserva solo nombre en la celda del componente, categoría en su columna y unidad junto a stock. Cuadrícula conserva marca/código/ubicación/disponibilidad, sin peso/unidad/categoría ni Detalles; salida es la única acción independiente y su icono es rojo.

Nombre y marca se normalizan al guardar altas/ediciones, y los campos personales/lugares/transportador de Salidas al enviar. Los snapshots del servidor requieren **`20261007000300_uppercase_registration.sql`**, después de lugares y todas las migraciones previas. No se aplicó en Supabase real. No se renombra masivamente inventario ni se modifican documentos/historial anteriores; se conservan permisos, stock e idempotencia. Completar envíos pendientes antiguos antes de actualizar. Pasaron typecheck, lint, **154 unitarias y 34 de integración (188)** y build. Procedimiento y revisión manual en `docs/formularios-y-nombres.md`.

## Capturar a todo el ancho en móvil

La corrección de cámara hace que Capturar ocupe las dos columnas de su fila por debajo de 640 px, con ancho del 100 % y altura mínima de 44 px. Se aplica en `CameraCaptureModal`, compartido por imágenes principal/adicionales de productos y registro fotográfico de salidas. Elegir archivo y Cambiar cámara conservan dos columnas; escritorio y la vista previa con Repetir/Usar foto conservan su disposición. No necesita SQL. Pasaron typecheck, lint, las 180 pruebas existentes y build. Sin automatización de navegador; confirmar el ancho y la captura en teléfono con el usuario. Commit/push autorizados y despliegue comprobado por separado.

## Empresa y NIT en remisiones

La actualización de remisiones añade lugares de remisión/origen y destino, obligatorios en Salidas, con código **REM-HONDA-BOGOTA-20261007-006**. Se eligió AAAAMMDD para la fecha numérica, con emisión del servidor en America/Bogota; el consecutivo continúa el conteo anual compartido sin reiniciarlo por ruta o día, con tres cifras mínimas y sin truncar cifras mayores. `dispatch_inventory_with_route` conserva las RPC transaccionales internas y los identificadores/FK existentes; actualiza el código visible y el motivo histórico solo en las salidas nuevas. Reintentos idénticos conservan documento/stock/consecutivo; los lugares y la identidad de emisión son inmutables. Las RPC antiguas se retiran como accesos directos para exigir los lugares.

**Activación adicional pendiente:** `supabase/migrations/20261007000200_remission_route.sql`, después de empresa y todas las migraciones anteriores. No se ejecutó en Supabase real ni hay sesión administrativa disponible. El frontend muestra los campos y comprueba la capacidad; no emite una salida sin el nuevo esquema. Finalizar reintentos de la versión antigua antes de activarlo; recargar o Comprobar de nuevo después. Procedimiento en `docs/lugares-y-codigos-remision.md`.

El PDF A4 queda alineado arriba, con el mismo margen y paginación medida. NIT hereda Arial/11 px como los datos del encabezado. Origen, destino y ubicación del proyecto son campos independientes. Peso unitario (kg) es una columna inmediatamente anterior a Peso total (kg); la descripción conserva nombre/marca y retira el texto de peso unitario. Se usan snapshots y Pendiente para datos ausentes. Los códigos largos se ajustan en PDF/tarjetas. Pasaron typecheck, lint, **148 pruebas unitarias y 32 de integración**, y build; revisión visual pendiente con el usuario, sin browser automation, Supabase real ni archivos privados.

La configuración de empresa añade **NIT: 800.176.581 inmediatamente debajo del logo** en cada página de la remisión. Administración de datos incorpora Empresa como octava sección: nombre, NIT, logo, dirección y teléfono compartidos entre cuentas. Solo `admin` guarda; los otros roles consultan. Los datos iniciales son EL TURPIAL, el NIT indicado y el logo aprobado, sin inventar dirección/teléfono. El nombre/logo se utilizan en navegación; los logos cargados conservan proporciones/transparencia y sus colores en oscuro.

**Activación pendiente en Supabase real:** ejecutar completo `supabase/migrations/20261007000100_company_profile.sql`, después de las migraciones anteriores. El agente no tiene sesión administrativa ni ejecutó SQL en producción. La migración se ensayó en PGlite; conserva inventario, stocks y partidas. El NIT inicial aparece en PDF incluso sin aplicar el SQL; guardar empresa requiere las funciones nuevas. Procedimiento en `docs/datos-empresa.md`.

Cada remisión nueva captura en el servidor los datos de empresa, incluyendo el logo, y esa copia no cambia al editar la configuración. Los reintentos conservan la copia original. Los documentos anteriores reciben únicamente los valores iniciales aprobados. El guardado controla versiones para evitar sobrescribir cambios de otra cuenta; los borradores sobreviven a errores y actualizaciones de caché. El perfil se carga sin bloquear el arranque del inventario si la migración todavía falta.

## Cambio visual implementado

La revisión más reciente de cinco capturas corrige los indicadores de fotografías (solo puntos/píldora, sin fondo ni sombra, con objetivo táctil transparente de 44 px y foco de teclado), el recorte de tarjetas de movimientos recientes y el espacio de materiales en Salidas. El menú móvil, sus acciones inferiores y la barra de accesos comparten `ui-sidebar-action` con escritorio: plano, hover elevado y selección hundida. Los materiales usan `DispatchCartLine`, con clic de toda la tarjeta, nombre transparente y controles −/cantidad/+/quitar independientes y adaptables. Registro fotográfico conserva `fieldset`/deshabilitado, pero mueve el título a un encabezado interior identificado con `aria-labelledby`.

Las fechas de transporte usan `DatePicker` en español, con mes/año, semana desde lunes, teclado, Hoy, Limpiar, límites y validación nativa mediante un valor ISO oculto. El calendario utiliza las paletas y el ciclo de foco/animación de los diálogos; Escape cierra primero el selector de mes/año, después calendario y finalmente el diálogo padre. Aritmética UTC evita saltos por cambio horario; Hoy utiliza la fecha local del equipo. Las pruebas verifican fechas bisiestas, formularios, límites, teclado, foco, deshabilitado y acciones del carrito. Pasaron typecheck, lint, **145 pruebas unitarias y 28 de integración**, y build. Sin SQL adicional, Supabase real, computer use ni automatización de navegador; revisión visual pendiente con el usuario. Publicar y comprobar Vercel/recursos públicos sigue autorizado.

**Neumorfismo es ahora el único estilo.** El usuario retiró su elección anterior de Liquid Glass y pidió eliminarlo junto con el botón de cambio de Ayuda. Se eliminaron componente, estado, API y reglas de vidrio. `data-ui-style` queda fijo en `neumorphism` para las reglas CSS; el arranque elimina la antigua clave `el_turpial_ui_style` cuando el almacenamiento lo permite y nunca utiliza su valor. Se conserva la preferencia claro/oscuro.

La barra lateral de escritorio sigue las capturas del laboratorio: botones planos en reposo, relieve al pasar el mouse y sombra interior para la pantalla activa, identificada con `aria-current="page"`. Ayuda y Cerrar sesión también quedan planos. **Nueva Remisión se retiró por duplicar Salidas**, que conserva la creación de remisiones. Las pestañas de Administración y los controles lista/cuadrícula comparten reposo plano, hover elevado y selección hundida/negrita mediante `ui-flat-choice`, con `aria-selected` para pestañas y `aria-pressed` para vistas/stock. El logo de empresa es clicable sin marco, fondo ni sombra, tanto en la barra como en la cabecera compacta; conserva el foco de teclado. Claro/oscuro sigue con barrido de **1,5 segundos** y alternativa de fundido; las interacciones cortas duran 180 ms y se respeta movimiento reducido. Publicar cada cambio verificado sigue autorizado; comprobar Vercel y recursos públicos. No se utilizó computer use ni automatización de navegador.

La última revisión de seis capturas elimina los contornos azules al enfocar campos y selectores: el foco usa sombra interior, también en buscadores, cantidades y altas de prefijos/categorías. Las descripciones se redimensionan solo verticalmente con mínimo de 44 px. Los chips reservan espacio para sus sombras y los filtros de stock comparten reposo plano, hover elevado y selección hundida mediante `aria-pressed`. La cabecera retira Supabase Activo y el avatar comparte tamaño/material de sus acciones, conservando identidad y adaptación móvil. Historial y Almacenes usan productos completos clicables con relieve en la fila/tarjeta, sin botones pequeños elevados alrededor del nombre. Se conservan los datos históricos, copia de texto, documentos y acceso con teclado. PDF/Fotos tienen altura y ancho uniformes y se apilan al faltar espacio. La lista de Inventario elimina el ojo; conserva salida y la cuadrícula retira Detalles y conserva la acción de salida con icono rojo.

## Proyecto y estado del código

La última captura de cantidades mostró el incremento nativo de 0,001 dentro de `NumberInput`. Se ocultan sus flechas internas en Chromium/WebKit y Firefox y se bloquean ArrowUp/ArrowDown, conservando escritura manual, decimales, validación y eventos personalizados. Las acciones −/+ laterales siguen cambiando una unidad con sus límites existentes. Se conservan la preferencia lista/cuadrícula y la sincronización entre pestañas de Administración y su selector compacto. Las pruebas existentes cubren los nuevos estados y la edición numérica; no se modifica SQL ni el inventario real.

Historial de ajustes anteriores: la transición original de 3 segundos pasó a **1,5 segundos**; posteriormente se retiró el cambio de estilo. Claro/oscuro usa un barrido suave de izquierda a derecha mediante View Transitions; si no está disponible, conserva un fundido de 1,5 segundos. Neumorfismo elimina los bordes y anillos decorativos de superficies, campos, avisos y portales, manteniendo sombras, símbolos, foco del teclado y el documento imprimible. Los cambios rápidos cancelan las capturas anteriores para que prevalezca la última elección.

El usuario aportó cuatro capturas con problemas visuales. La corrección publicada en `b73b0d0` reserva espacio para sombras dentro del scroll de navegación, aplica el relieve al contenedor exterior de filtros, respeta los selectores de bloque y coloca Alcance sobre su campo. Las tarjetas del dashboard tienen más separación; el peso reserva el ancho de su unidad y se apila por debajo de 480 px. Se conservan los 1,5 segundos y las reglas sin bordes de Neumorfismo.

La revisión de campos y botones publicada en `ecadc93` normaliza campos de una línea/selectores a 44 px y acciones a superficie neutra con relieve; el azul es `#3e4e9e`, con texto rojo, verde o amarillo según el significado y variantes claras en oscuro. Las descripciones siguen siendo multilínea. Las acciones de stock −/+ son botones separados del campo para compartir ese tratamiento. Ver elemento tiene separación de 24 px entre bloques y 16 px entre acciones, con menos botones por fila cuando falta espacio. Ese commit también ajustó el vidrio a una captura de iPhone; ese estilo y sus efectos se retiraron por la petición actual. Los botones de la barra lateral son la excepción actual al relieve permanente. La evaluación visual real sigue a cargo del usuario.

El hover común y los productos clicables se publicaron en `fd61f30`: desplazamiento de 2 px durante 180 ms en dispositivos con mouse. `src/interactions.css` comparte la animación y respeta movimiento reducido, impresión y la transición de paleta de 1,5 segundos. Las filas y tarjetas de `ExplorerResults` abren el detalle desde toda su superficie, sin subrayar el nombre; sus acciones internas no duplican la apertura ni confunden salida con consulta. La selección de texto no abre la ficha. El nombre conserva un botón nativo con nombre accesible y foco visible en el contenedor. La lista separa las filas y reserva espacio para sus sombras. La petición actual conserva este comportamiento y añade las reglas específicas de barra lateral en `src/sidebar.css`.

- Repositorio local: `C:/Users/Assas/Downloads/inventario-fulgor`.
- Remoto: `https://github.com/Hyperhacker3/inventario-fulgor.git`, rama `main`.
- Aplicación publicada: `https://inventario-fulgor.vercel.app/`.
- Primera implementación de estilos: `f8e7ae3`; barrido de 1,5 segundos y Neumorfismo sin bordes: `3f9c10b`. Ambos publicados y verificados mediante el estado de Vercel y los recursos de la URL pública. La corrección de las cuatro capturas sucede después. Para identificar su versión y despliegue, consultar el historial de `main` y Vercel; no deducir la versión publicada solo de este documento.
- `c32e702` conserva estados importados que no pertenecen a las opciones antiguas del formulario y protege los archivos privados frente al servidor de desarrollo.
- Stack: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query y Supabase. Node 22.x y pnpm indicados en `package.json`.
- La marca visible es **EL TURPIAL**. El nombre técnico del repositorio y la URL histórica siguen conteniendo `fulgor`; no renombrarlos como parte del cambio de estilo.
- Logo y favicon aprobados: `public/logo-completo.png` y `public/logo-favicon.png`; conservar los archivos. El perfil compartido permite elegir otro logo para navegación y remisiones; Restaurar logo original usa el archivo aprobado. El favicon estático permanece.
- Nombre/cargo visible solicitado: **Andrés Castañeda / Almacenista**, separados del correo de inicio de sesión. No convertir esta identidad en un reemplazo fijo para todas las cuentas.

## Inventario real confirmado

El usuario ejecutó manualmente en Supabase la importación del 6 de octubre y confirmó que la aplicación se ve correcta.

| Dato | Resultado al verificar |
| --- | ---: |
| Elementos anteriores conservados | 678 |
| Filas del nuevo Excel añadidas | 867 |
| Elementos totales | 1.545 |
| Nuevos elementos con estantería y nivel | 341 |
| Nuevos elementos sin estantería/nivel declarado | 526 |
| Cantidades pendientes de confirmar | 4 |
| Precios pendientes de declarar | 11 |

Los nuevos elementos pertenecen a **Almacén Turpial (CON-05)**. Se crearon cuatro estanterías, 13 niveles y nueve categorías del Excel, además de usar OTROS para cuatro categorías vacías. La distribución por las 13 ubicaciones se comparó con el archivo original y coincide exactamente. Estos son conteos históricos de verificación, no constantes de la app.

Decisiones expresamente confirmadas:

- PRECIO es valor unitario en COP; todas las cantidades nuevas están en UND.
- Cada fila se conserva por separado, incluidas las idénticas. No deduplicar por nombre o marca.
- Cuatro cantidades vacías entraron como 0 con stock pendiente; once precios vacíos como 0 con metadato de pendiente; cuatro categorías vacías como OTROS; las marcas vacías se conservaron sin inventarlas.
- Se conservaron estados como OBSOLETO. Las unidades dañadas no se dedujeron del estado: su cantidad quedó en 0 cuando faltaba el dato, con metadato de revisión cuando corresponde. Los valores dañados del dashboard dependen de las unidades dañadas declaradas.
- Los pesos no declarados siguen pendientes; no rellenarlos con pesos ficticios.

Los archivos privados están en `.private_import/20261006_almacen/`, ignorados por Git. El Excel `almacén.xlsx` está en la raíz y **sin versionar**. El respaldo original y los SQL no deben incorporarse al repositorio, copiarse al frontend ni publicarse. No repetir la importación para hacer un cambio visual. No limpiar ni borrar los archivos privados por iniciativa propia.

## Funciones que deben conservarse

- Supabase es la fuente del inventario real. No añadir productos locales, fixtures ni respaldo JSON como alternativa de producción.
- Jerarquía: **almacén → estantería → nivel → caja**. Entradas permite crear materiales con ubicaciones y catálogos autorizados; edición permite elegir ubicaciones existentes o crear estantería, nivel y caja en el mismo formulario.
- Prefijos de tres letras con consecutivo definitivo asignado por Supabase; categorías y marcas personalizadas.
- Pesos g/kg y valores COP; cálculo y conservación histórica de cantidades, pesos y precios en las remisiones.
- Fotos de productos cuadradas de hasta 600 × 600, varias imágenes y almacenamiento privado en Supabase. Registro fotográfico de salidas consultable desde el historial, separado del PDF.
- Entradas, salidas, proyectos, historial, archivado, desarchivado y eliminación solo de productos archivados según permisos.
- Dashboard de inventario, valores por ubicación, material dañado e inversión por proyecto.
- Selectores personalizados, filtros por ubicación y selección de varias categorías.
- Vista de lista/cuadrícula recordada, historial del navegador y conservación de formularios al cambiar de pestaña del navegador.
- Navegación móvil superpuesta, cierre exterior, barra inferior que ocupa espacio y tratamiento del teclado.
- Spinner solo durante el arranque inicial; las transiciones entre pantallas no deben volver a ocultar la app con ese spinner.
- Cámaras disponibles según dispositivo: todas en PC y únicamente traseras identificadas en móvil/tablet.

## Apariencia existente y demo

La app combina Tailwind y CSS propio. `src/appearance.css` define tokens de Neumorfismo compartidos para superficies, campos, controles y portales; `src/controls.css` uniforma alturas, superficies de botones y sus colores semánticos. `src/sidebar.css`, importado después de los estilos comunes, limita el relieve de la navegación de escritorio a hover, pulsación y selección, y elimina el marco de los botones de marca. Las sombras se adaptan a cada paleta. Usa fuentes locales Hanken Grotesk, JetBrains Mono y Material Symbols; Material Symbols es el conjunto de iconos, no una biblioteca completa de componentes Material UI. Azul conservado: `#3e4e9e`, con `#253685` como variante; las acciones usan azul claro en oscuro para mantener legibilidad.

La demo elegida está fuera del repositorio:

`C:/Users/Assas/.codex/visualizations/2026/10/01/01a0f509-24a1-7993-89d4-5bcc37781997/ui-design-lab.html`

El laboratorio histórico incluye Neumorfismo, Bento Grid y Liquid Glass en Inventario, Dashboard y Nuevo ítem; temas claro/oscuro y anchos de móvil/tablet/escritorio. La aplicación utiliza **solo Neumorfismo** por la decisión posterior del usuario. El laboratorio se conserva como referencia de navegación y no se modifica para esta retirada.

Es HTML independiente con datos ficticios y logo/fuente embebidos. No tiene conexión a Supabase y no es la implementación React. Los selectores de la demo son ilustrativos; la aplicación debe conservar sus selectores personalizados. No copiar al código de producción sus datos de muestra ni sus acciones simuladas. Los tamaños de dispositivo son una simulación de ancho, no una comprobación en un teléfono físico.

## Puntos de entrada técnicos

| Responsabilidad | Archivos principales |
| --- | --- |
| Arranque y paleta | `index.html`, `src/main.tsx`, `src/shared/theme.ts` |
| Preferencia claro/oscuro | `src/context/ThemeContext.tsx`, `src/components/ThemeToggle.tsx` |
| CSS común, estilos y paleta oscura | `src/index.css`, `src/appearance.css`, `src/theme.css` |
| Alturas uniformes y botones sin rellenos de color | `src/controls.css`, `tests/unit/controlAppearance.test.ts` |
| Hover común y productos completos clicables | `src/interactions.css`, `src/shared/productInteraction.ts`, `src/components/explorer/ExplorerResults.tsx`, `tests/unit/productInteractions.test.ts` |
| Productos de historial/almacenes y documentos | `src/components/history/HistoryTable.tsx`, `MovementDocuments.tsx`, `src/components/warehouses/WarehouseTree.tsx`, `tests/unit/relatedProductLists.test.ts` |
| Categorías y selección de stock | `src/components/explorer/CategoryFilter.tsx`, `ExplorerFilters.tsx`, `tests/unit/explorerFilters.test.ts` |
| Navegación plana, pestañas, vistas y logo | `src/sidebar.css`, `src/components/Sidebar.tsx`, `src/components/administration/AdministrationNavigation.tsx`, `src/components/ExplorerView.tsx`, `tests/unit/sidebarAppearance.test.ts` |
| Cantidades sin flechas internas | `src/components/NumberInput.tsx`, `src/controls.css`, `tests/unit/interaction.test.ts`, `tests/unit/controlAppearance.test.ts` |
| Perfil compartido de empresa | `src/domain/company.ts`, `src/state/useCompanyProfile.ts`, `src/components/administration/CompanyProfileEditor.tsx`, `src/shared/companyLogo.ts` |
| Empresa inmutable en remisiones | `supabase/migrations/20261007000100_company_profile.sql`, `src/data/mappers.ts`, `src/components/remission/RemissionSections.tsx`, `tests/unit/company.test.ts`, `tests/integration/database.mjs` |
| Ayuda sin selector de estilo | `src/components/HelpModal.tsx` |
| Fondo sin fotografía adaptado al estilo | `src/components/ItemPhotoPlaceholder.tsx` |
| Pruebas de preferencias y transiciones | `tests/unit/theme.test.ts` |
| Barrido, alternativa y cancelación de capturas | `src/shared/appearanceTransition.ts`, `tests/unit/appearanceTransition.test.ts` |
| Selectores y ventanas | `src/components/ui/Select.tsx`, `FormDialog.tsx`, `Motion.tsx` |
| Navegación | `Header.tsx`, `Sidebar.tsx`, `navigation/MobileMenu.tsx`, `navigation/MobileBottomNav.tsx` |
| Vistas y formularios | `ExplorerView.tsx`, `DashboardView.tsx`, `EntryView.tsx`, `ItemRegistrationForm.tsx`, `ItemDetailModal.tsx`, `DataAdministrationView.tsx` y `administration/WarehousesManager.tsx` |
| Remisión imprimible | `src/components/remission/RemissionDocument.tsx`, `remission.css`, `PdfRemissionModal.tsx` |

Los nombres abreviados de componentes de esta tabla se resuelven bajo `src/components/` salvo que se indique otra carpeta. `el_turpial_theme` conserva la preferencia claro/oscuro; ya no existe una preferencia de estilo.

## Verificación y límites

Antes de publicar cambios de app: `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`. Para esta implementación pasaron typecheck, lint, **139 pruebas unitarias y 28 de integración**, y build. Las cinco pruebas nuevas de empresa comprueban NIT bajo logo, datos históricos, validación, borradores, permisos, guardados y preparación de logo. Tres pruebas SQL verifican acceso por rol, validación, conflicto de versiones, copia inmutable, reintentos y repetición de la migración sin modificar stocks/partidas. Se mantienen las pruebas de tema, navegación, controles, productos, valores y permisos. No se mide geometría, movimiento ni contraste real. Node 24.19.0 disponible frente a Node 22.x declarado. Sin revisión visual automatizada ni operaciones en Supabase real. La importación privada anterior y sus SQL no forman parte de este cambio.

La demo tiene comprobaciones DOM con JSDOM para las nueve combinaciones de estilo/pantalla, búsqueda, detalle, lista/cuadrícula, tema, selector de anchos y registro local. No se hizo verificación visual mediante navegador automatizado ni se midió rendimiento en un dispositivo físico.

Mantener la instrucción de no usar computer use ni automatización de navegador. La excepción antigua para una prueba de impresión no autoriza pruebas visuales nuevas. El usuario revisa la UI y ejecuta los pasos SQL desde su cuenta; no hay sesión administrativa ni conector de Supabase disponible para el agente. No leer ni solicitar contraseñas o claves privadas.

Revisar `git status` antes de preparar commits; excluir expresamente Excel y archivos privados. No usar `git add .`. La publicación anterior autorizada en `main` no implica que esta implementación esté desplegada. La configuración compartida de empresa requiere la migración nueva; las correcciones visuales anteriores no necesitaban SQL. No repetir importaciones ni modificar stock para activar la empresa.

**Autorización permanente del usuario, 7 de octubre de 2026:** «Sii, has push a cada cambio que hagamos». Crear commit y hacer push a `origin/main` después de cada cambio terminado y verificado, incluyendo la corrección visual `b73b0d0`. El push activa el despliegue de Vercel; comprobar su resultado y los recursos públicos antes de afirmar que el cambio está publicado. Esta autorización se mantiene para los cambios posteriores de este proyecto, salvo que el usuario la modifique.

## Trabajo pendiente para continuar

La activación de empresa requiere que el usuario aplique la migración desde su cuenta, abra Administración → Empresa y confirme lectura/guardado. Revisar NIT, logo y contactos en PDF; editar empresa y comprobar que documentos anteriores conservan su copia.

1. Revisar con el usuario Neumorfismo claro/oscuro, barra lateral, stock, Administración y lista/cuadrícula planos/hover/seleccionados. Confirmar Nueva Remisión retirado y cantidades sin flechas nativas, con −/+ de una unidad. Incluir foco sin contorno, alturas mínimas, avatar, chips, productos completos, documentos, navegación móvil e impresión según `docs/estilos-interfaz.md`.
2. Ajustar la apariencia si la revisión lo requiere y ejecutar las comprobaciones pertinentes después de cualquier cambio de código.
3. La publicación está autorizada por el usuario. Comprobar que el commit llegó a `origin/main`, que Vercel terminó y que la URL pública entrega el arranque fijo de Neumorfismo, Ayuda sin selector y los recursos nuevos. El Excel y las importaciones privadas deben permanecer fuera de los commits y del despliegue.

## Mensaje sugerido para continuar la revisión

> Lee README.md, docs/CONTINUIDAD.md, docs/estilos-interfaz.md y docs/datos-empresa.md. La remisión muestra NIT 800.176.581 bajo el logo. Empresa permite editar nombre, NIT, logo, dirección y teléfono; necesita activar la migración nueva desde la cuenta del usuario. Conserva la copia inmutable de empresa en documentos, Neumorfismo, controles planos/seleccionados, campos sin contorno, cantidades sin flechas nativas y barrido claro/oscuro de 1,5 segundos. Haz commit y push después de cada cambio verificado y comprueba el despliegue. No uses computer use ni automatización de navegador ni publiques archivos privados.
