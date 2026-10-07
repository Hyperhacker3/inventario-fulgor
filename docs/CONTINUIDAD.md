# Continuidad de Inventario EL TURPIAL

Actualizado: **7 de octubre de 2026**, zona horaria America/Bogota.

Este documento resume el estado para continuar en otro chat. Las secciones anteriores de `reports/verification.md` y `PLAN_REFACTORIZACION.md` son registros históricos; sus conteos y pendientes no sustituyen este estado actual.

## Empresa y NIT en remisiones

La petición más reciente añade **NIT: 800.176.581 inmediatamente debajo del logo** en cada página de la remisión. Administración de datos incorpora Empresa como octava sección: nombre, NIT, logo, dirección y teléfono compartidos entre cuentas. Solo `admin` guarda; los otros roles consultan. Los datos iniciales son EL TURPIAL, el NIT indicado y el logo aprobado, sin inventar dirección/teléfono. El nombre/logo se utilizan en navegación; los logos cargados conservan proporciones/transparencia y sus colores en oscuro.

**Activación pendiente en Supabase real:** ejecutar completo `supabase/migrations/20261007000100_company_profile.sql`, después de las migraciones anteriores. El agente no tiene sesión administrativa ni ejecutó SQL en producción. La migración se ensayó en PGlite; conserva inventario, stocks y partidas. El NIT inicial aparece en PDF incluso sin aplicar el SQL; guardar empresa requiere las funciones nuevas. Procedimiento en `docs/datos-empresa.md`.

Cada remisión nueva captura en el servidor los datos de empresa, incluyendo el logo, y esa copia no cambia al editar la configuración. Los reintentos conservan la copia original. Los documentos anteriores reciben únicamente los valores iniciales aprobados. El guardado controla versiones para evitar sobrescribir cambios de otra cuenta; los borradores sobreviven a errores y actualizaciones de caché. El perfil se carga sin bloquear el arranque del inventario si la migración todavía falta.

## Cambio visual implementado

**Neumorfismo es ahora el único estilo.** El usuario retiró su elección anterior de Liquid Glass y pidió eliminarlo junto con el botón de cambio de Ayuda. Se eliminaron componente, estado, API y reglas de vidrio. `data-ui-style` queda fijo en `neumorphism` para las reglas CSS; el arranque elimina la antigua clave `el_turpial_ui_style` cuando el almacenamiento lo permite y nunca utiliza su valor. Se conserva la preferencia claro/oscuro.

La barra lateral de escritorio sigue las capturas del laboratorio: botones planos en reposo, relieve al pasar el mouse y sombra interior para la pantalla activa, identificada con `aria-current="page"`. Ayuda y Cerrar sesión también quedan planos. **Nueva Remisión se retiró por duplicar Salidas**, que conserva la creación de remisiones. Las pestañas de Administración y los controles lista/cuadrícula comparten reposo plano, hover elevado y selección hundida/negrita mediante `ui-flat-choice`, con `aria-selected` para pestañas y `aria-pressed` para vistas/stock. El logo de empresa es clicable sin marco, fondo ni sombra, tanto en la barra como en la cabecera compacta; conserva el foco de teclado. Claro/oscuro sigue con barrido de **1,5 segundos** y alternativa de fundido; las interacciones cortas duran 180 ms y se respeta movimiento reducido. Publicar cada cambio verificado sigue autorizado; comprobar Vercel y recursos públicos. No se utilizó computer use ni automatización de navegador.

La última revisión de seis capturas elimina los contornos azules al enfocar campos y selectores: el foco usa sombra interior, también en buscadores, cantidades y altas de prefijos/categorías. Las descripciones se redimensionan solo verticalmente con mínimo de 44 px. Los chips reservan espacio para sus sombras y los filtros de stock comparten reposo plano, hover elevado y selección hundida mediante `aria-pressed`. La cabecera retira Supabase Activo y el avatar comparte tamaño/material de sus acciones, conservando identidad y adaptación móvil. Historial y Almacenes usan productos completos clicables con relieve en la fila/tarjeta, sin botones pequeños elevados alrededor del nombre. Se conservan los datos históricos, copia de texto, documentos y acceso con teclado. PDF/Fotos tienen altura y ancho uniformes y se apilan al faltar espacio. La lista de Inventario elimina el ojo; conserva salida y la cuadrícula conserva Detalles.

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
- Jerarquía: **almacén → estantería → nivel → caja**. Nuevo ítem permite crear las ubicaciones y catálogos autorizados; edición elige ubicaciones existentes.
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
| Vistas | `ExplorerView.tsx`, `DashboardView.tsx`, `NewItemView.tsx`, `ItemDetailModal.tsx` y demás componentes |
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
