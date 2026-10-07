# Continuidad de Inventario EL TURPIAL

Actualizado: **7 de octubre de 2026**, zona horaria America/Bogota.

Este documento resume el estado para continuar en otro chat. Las secciones anteriores de `reports/verification.md` y `PLAN_REFACTORIZACION.md` son registros históricos; sus conteos y pendientes no sustituyen este estado actual.

## Cambio visual implementado

El usuario probó una demo separada y eligió **Liquid Glass y Neumorfismo**. La aplicación permite alternarlos sin recargar, manteniendo las funciones y los datos. **Neumorfismo es el predeterminado** y el botón está al final del contenido de **Ayuda y conexión**, antes de Cerrar. Ambos estilos tienen paletas clara y oscura, con elecciones independientes y persistencia local.

Implementado el 7 de octubre por petición del usuario. Las transiciones de estilo y claro/oscuro duran **1,5 segundos**; las de navegación y apertura/cierre siguen en 180 ms. Se respeta movimiento reducido. `data-ui-style` y `el_turpial_ui_style` guardan el estilo, separados de `data-theme` y `el_turpial_theme`. El arranque HTML restaura ambas preferencias antes de React. El usuario solicitó después crear el commit, subirlo a GitHub y publicar la actualización. El despliegue se comprueba por separado y queda pendiente la revisión visual del usuario; no se utilizó computer use ni automatización de navegador.

## Proyecto y estado del código

El ajuste posterior sustituye la transición original de 3 segundos por **1,5 segundos** en ambos cambios. Claro/oscuro usa un barrido suave de izquierda a derecha mediante View Transitions; si no está disponible, conserva un fundido de 1,5 segundos. Neumorfismo elimina los bordes y anillos decorativos de superficies, campos, avisos y portales, manteniendo sombras, símbolos, foco del teclado y el documento imprimible. Los cambios rápidos cancelan las capturas anteriores para que prevalezca la última elección.

El usuario aportó cuatro capturas con problemas visuales. La corrección publicada en `b73b0d0` reserva espacio para sombras dentro del scroll de navegación, aplica el relieve al contenedor exterior de filtros, respeta los selectores de bloque y coloca Alcance sobre su campo. Las tarjetas del dashboard tienen más separación; el peso reserva el ancho de su unidad y se apila por debajo de 480 px. Se conservan los 1,5 segundos y las reglas sin bordes de Neumorfismo.

En la siguiente revisión pidió unificar las alturas, separar las acciones de Ver elemento, eliminar los rellenos coloreados de todos los botones y aproximar Liquid Glass a la captura del Centro de control de iPhone. `src/controls.css` normaliza campos de una línea/selectores a 44 px y acciones a superficie neutra con relieve; el azul es `#3e4e9e`, con texto rojo, verde o amarillo según el significado y variantes claras en oscuro. Las descripciones siguen siendo multilínea. Las acciones de stock −/+ son botones separados del campo para compartir ese tratamiento. Ver elemento tiene separación de 24 px entre bloques y 16 px entre acciones, con menos botones por fila cuando falta espacio. El vidrio reduce la opacidad, añade reflejos graduados y bordes luminosos, y aplica desenfoque a las capas y controles sobre el fondo ambiente. La evaluación visual y de rendimiento real sigue a cargo del usuario; no se utilizó automatización de navegador.

La petición posterior extiende el hover de navegación a todos los botones y productos del inventario: desplazamiento de 2 px durante 180 ms en dispositivos con mouse. `src/interactions.css` comparte la animación y respeta movimiento reducido, impresión y las transiciones de apariencia de 1,5 segundos. Las filas y tarjetas de `ExplorerResults` abren el detalle desde toda su superficie, sin subrayar el nombre; sus acciones internas no duplican la apertura ni confunden salida con consulta. La selección de texto no abre la ficha. El nombre conserva un botón nativo con nombre accesible y foco visible en el contenedor. La lista separa las filas y reserva espacio para sus sombras; Neumorfismo sigue sin bordes y Liquid Glass conserva el contorno.

- Repositorio local: `C:/Users/Assas/Downloads/inventario-fulgor`.
- Remoto: `https://github.com/Hyperhacker3/inventario-fulgor.git`, rama `main`.
- Aplicación publicada: `https://inventario-fulgor.vercel.app/`.
- Primera implementación de estilos: `f8e7ae3`; barrido de 1,5 segundos y Neumorfismo sin bordes: `3f9c10b`. Ambos publicados y verificados mediante el estado de Vercel y los recursos de la URL pública. La corrección de las cuatro capturas sucede después. Para identificar su versión y despliegue, consultar el historial de `main` y Vercel; no deducir la versión publicada solo de este documento.
- `c32e702` conserva estados importados que no pertenecen a las opciones antiguas del formulario y protege los archivos privados frente al servidor de desarrollo.
- Stack: React 19, TypeScript, Vite, Tailwind CSS, TanStack Query y Supabase. Node 22.x y pnpm indicados en `package.json`.
- La marca visible es **EL TURPIAL**. El nombre técnico del repositorio y la URL histórica siguen conteniendo `fulgor`; no renombrarlos como parte del cambio de estilo.
- Logo y favicon aprobados: `public/logo-completo.png` y `public/logo-favicon.png`; conservarlos.
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

La app combina Tailwind y CSS propio. `src/appearance.css` define tokens de paleta y material compartidos para superficies, campos, controles y portales; `src/controls.css` uniforma alturas, superficies de botones y sus colores semánticos. El vidrio incluye desenfoque de paneles/controles, con radios menores de desenfoque en móvil y fondos opacos sin soporte de filtros. El relieve adapta las sombras a cada paleta. Usa fuentes locales Hanken Grotesk, JetBrains Mono y Material Symbols; Material Symbols es el conjunto de iconos, no una biblioteca completa de componentes Material UI. Azul conservado: `#3e4e9e`, con `#253685` como variante; las acciones usan azul claro en oscuro para mantener legibilidad.

La demo elegida está fuera del repositorio:

`C:/Users/Assas/.codex/visualizations/2026/10/01/01a0f509-24a1-7993-89d4-5bcc37781997/ui-design-lab.html`

Incluye Neumorfismo, Bento Grid y Liquid Glass en Inventario, Dashboard y Nuevo ítem; temas claro/oscuro y anchos de móvil/tablet/escritorio. La aplicación incorporó **Liquid Glass y Neumorfismo; Bento queda fuera del alcance**.

Es HTML independiente con datos ficticios y logo/fuente embebidos. No tiene conexión a Supabase y no es la implementación React. Los selectores de la demo son ilustrativos; la aplicación debe conservar sus selectores personalizados. No copiar al código de producción sus datos de muestra ni sus acciones simuladas. Los tamaños de dispositivo son una simulación de ancho, no una comprobación en un teléfono físico.

## Puntos de entrada técnicos

| Responsabilidad | Archivos principales |
| --- | --- |
| Arranque y paleta | `index.html`, `src/main.tsx`, `src/shared/theme.ts` |
| Preferencia claro/oscuro | `src/context/ThemeContext.tsx`, `src/components/ThemeToggle.tsx` |
| CSS común, estilos y paleta oscura | `src/index.css`, `src/appearance.css`, `src/theme.css` |
| Alturas uniformes y botones sin rellenos de color | `src/controls.css`, `tests/unit/controlAppearance.test.ts` |
| Hover común y productos completos clicables | `src/interactions.css`, `src/components/explorer/ExplorerResults.tsx`, `tests/unit/productInteractions.test.ts` |
| Selector de estilo al final de Ayuda | `src/components/HelpModal.tsx`, `src/components/UIStyleToggle.tsx` |
| Fondo sin fotografía adaptado al estilo | `src/components/ItemPhotoPlaceholder.tsx` |
| Pruebas de preferencias y transiciones | `tests/unit/theme.test.ts` |
| Barrido, alternativa y cancelación de capturas | `src/shared/appearanceTransition.ts`, `tests/unit/appearanceTransition.test.ts` |
| Selectores y ventanas | `src/components/ui/Select.tsx`, `FormDialog.tsx`, `Motion.tsx` |
| Navegación | `Header.tsx`, `Sidebar.tsx`, `navigation/MobileMenu.tsx`, `navigation/MobileBottomNav.tsx` |
| Vistas | `ExplorerView.tsx`, `DashboardView.tsx`, `NewItemView.tsx`, `ItemDetailModal.tsx` y demás componentes |
| Remisión imprimible | `src/components/remission/RemissionDocument.tsx`, `remission.css`, `PdfRemissionModal.tsx` |

Los nombres abreviados de componentes de esta tabla se resuelven bajo `src/components/` salvo que se indique otra carpeta. `el_turpial_theme` es la clave existente de preferencia claro/oscuro; no reutilizarla para guardar el estilo.

## Verificación y límites

Antes de publicar cambios de app: `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`. Para esta implementación pasaron typecheck, lint, **126 pruebas unitarias y 25 de integración**, y build. Se verifican en DOM las preferencias, las cuatro combinaciones al arrancar, formularios y selector abierto conservados, almacenamiento bloqueado y duración de la transición. Las pruebas CSS/DOM comprueban alturas y tratamiento común de botones, significado por variables de color, y exclusiones de opciones, fondos de cierre, valores nativos ocultos e impresión. Ocho pruebas nuevas comprueban el clic completo en lista/cuadrícula, acciones sin duplicados, salidas bloqueadas por stock agotado/dañado, selección de texto y acceso por botón nativo con foco. JSDOM no mide geometría física ni reproduce desenfoque, refracción o interpolación de propiedades registradas. Las pruebas se ejecutaron con Node 24.19.0 disponible, aunque el proyecto solicita Node 22.x. No se realizó revisión visual de la app en navegador ni medición en un dispositivo físico. En la carga privada anterior se ejecutaron 12 comprobaciones de PostgreSQL embebido; el usuario ejecutó y verificó el SQL en su Supabase.

La demo tiene comprobaciones DOM con JSDOM para las nueve combinaciones de estilo/pantalla, búsqueda, detalle, lista/cuadrícula, tema, selector de anchos y registro local. No se hizo verificación visual mediante navegador automatizado ni se midió rendimiento en un dispositivo físico.

Mantener la instrucción de no usar computer use ni automatización de navegador. La excepción antigua para una prueba de impresión no autoriza pruebas visuales nuevas. El usuario revisa la UI y ejecuta los pasos SQL desde su cuenta; no hay sesión administrativa ni conector de Supabase disponible para el agente. No leer ni solicitar contraseñas o claves privadas.

Revisar `git status` antes de preparar commits; excluir expresamente Excel y archivos privados. No usar `git add .`. La publicación anterior autorizada en `main` no implica que esta implementación esté desplegada. Este cambio visual no requiere SQL ni modificación del inventario.

**Autorización permanente del usuario, 7 de octubre de 2026:** «Sii, has push a cada cambio que hagamos». Crear commit y hacer push a `origin/main` después de cada cambio terminado y verificado, incluyendo la corrección visual `b73b0d0`. El push activa el despliegue de Vercel; comprobar su resultado y los recursos públicos antes de afirmar que el cambio está publicado. Esta autorización se mantiene para los cambios posteriores de este proyecto, salvo que el usuario la modifique.

## Trabajo pendiente para continuar

1. Revisar con el usuario las cuatro combinaciones de estilo/paleta, contraste, selectores, ventanas, navegación móvil y remisiones impresas, siguiendo la guía de `docs/estilos-interfaz.md`.
2. Ajustar la apariencia si la revisión lo requiere y ejecutar las comprobaciones pertinentes después de cualquier cambio de código.
3. La publicación está autorizada por el usuario. Comprobar que el commit de estilos llegó a `origin/main` y que la URL pública entrega el HTML con `el_turpial_ui_style` y sus recursos nuevos. El Excel y las importaciones privadas deben permanecer fuera de los commits y del despliegue.

## Mensaje sugerido para continuar la revisión

> Lee README.md, docs/CONTINUIDAD.md y docs/estilos-interfaz.md. Liquid Glass y Neumorfismo ya están implementados y se solicitó su publicación. Revisa Git y el despliegue real antes de continuar; conserva Neumorfismo predeterminado, el botón al final de Ayuda y los 1,5 segundos al cambiar estilo o claro/oscuro. Conserva funciones, datos de Supabase y formato de los PDF. No uses computer use ni automatización de navegador.
