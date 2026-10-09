# Reglas del proyecto Inventario EL TURPIAL

Estas instrucciones se aplican a todo el repositorio. Recogen las decisiones documentadas del usuario; sus instrucciones actuales pueden modificarlas.

## Documentación y continuidad

- Leer primero `README.md` y `docs/CONTINUIDAD.md` antes de realizar cambios. Consultar `docs/estilos-interfaz.md` para la interfaz y las guías específicas de las funciones afectadas.
- Mantener la documentación sincronizada con los cambios terminados y sus comprobaciones.
- Los registros anteriores de `reports/verification.md` y `PLAN_REFACTORIZACION.md` son históricos. No tratar sus conteos o pendientes como el estado actual ni fijar conteos de inventario en el código.
- Usar React, TypeScript, Vite, Tailwind CSS, TanStack Query y Supabase según la arquitectura existente. Respetar Node 22.x y la versión de pnpm indicada en `package.json`.

## Identidad y apariencia

- La marca visible es **EL TURPIAL**. Conservar el nombre técnico `inventario-fulgor`, el remoto y la URL histórica; no renombrarlos como parte de cambios visuales.
- Conservar `public/logo-completo.png` y `public/logo-favicon.png`. El perfil compartido puede seleccionar otro logo, manteniendo la opción de restaurar el original y el favicon estático.
- Respetar la identidad de cada cuenta. No sustituir a todos los usuarios por el nombre/cargo solicitado para una cuenta concreta.
- **Neumorfismo es el único estilo**, con modos claro y oscuro y preferencia recordada. No reintroducir Liquid Glass ni el selector de estilo.
- Usar las sombras y tokens compartidos existentes; no añadir bordes delineados ni anillos decorativos. Conservar el foco visible de teclado y el formato imprimible.
- Mantener campos de una línea y selectores de 44 px, descripciones multilínea, superficies neutras y colores semánticos. Conservar el azul `#3e4e9e` y las variantes legibles en oscuro.
- Navegación, pestañas, filtros de stock y controles lista/cuadrícula: planos en reposo, elevados en hover y hundidos al seleccionar. Conservar colores por función, estados accesibles e iconos delineados/rellenos según interacción y selección.
- Claro/oscuro usa un barrido de izquierda a derecha de 1,5 segundos y fundido cuando View Transitions no está disponible. Apertura e interacciones cortas: 180 ms; cierre de ventanas, selectores y menú móvil: 360 ms. Respetar movimiento reducido.
- Reservar espacio para sombras y contenido en móvil, tablet y escritorio. Mantener el logo sin marco, fondo ni sombra.
- No reintroducir accesos retirados: Nueva Remisión duplica Salidas, el alta de materiales está en Entradas y Almacenes está en Administración de datos. Conservar los alias de navegación antiguos.

## Datos reales y archivos privados

- Supabase es la fuente del inventario real. No añadir productos locales, fixtures ni respaldos JSON como alternativa de producción; no trasladar datos o acciones simuladas de la demo al frontend real.
- No repetir importaciones ni modificar stock para cambios visuales o para activar la configuración de empresa.
- Conservar cada fila importada por separado, incluso las idénticas. No deduplicar por nombre o marca ni inventar marcas, pesos, precios o cantidades pendientes.
- No deducir unidades dañadas del estado físico. Preservar los metadatos de datos pendientes y calcular valores dañados con las unidades declaradas.
- El Excel `almacén.xlsx`, `.private_import/`, sus respaldos y SQL privados deben permanecer fuera de commits, frontend y despliegues. No limpiar ni borrar estos archivos por iniciativa propia.
- No leer ni solicitar contraseñas o claves privadas.
- El usuario ejecuta los pasos SQL de producción desde su cuenta. Preparar y documentar las migraciones necesarias; no afirmar que están aplicadas basándose únicamente en los archivos locales o pruebas de PGlite.

## Funciones que deben conservarse

- Conservar roles, permisos, validaciones, bloqueos durante operaciones pendientes, borradores y reintentos.
- Mantener la jerarquía almacén → estantería → nivel → caja, los selectores personalizados y la creación autorizada de ubicaciones y catálogos desde los formularios existentes.
- Mantener prefijos de tres letras y consecutivos definitivos asignados por Supabase; categorías y marcas personalizadas.
- Conservar pesos g/kg, valores COP y las copias históricas de cantidades, pesos, precios y empresa en remisiones. Editar la empresa no cambia documentos anteriores; los reintentos conservan la copia original.
- Mantener entradas, salidas, proyectos, historial, remisiones, archivado y desarchivado. La eliminación corresponde únicamente a productos archivados y respeta permisos.
- Conservar dashboard, valores por ubicación, material dañado e inversión por proyecto.
- Mantener fotografías múltiples de productos, cuadradas de hasta 600 × 600 y con almacenamiento privado; el registro fotográfico de salidas sigue separado del PDF y consultable desde el historial.
- Mantener cámaras disponibles según dispositivo: todas en PC y únicamente traseras identificadas en móvil/tablet; conservar la elección de lente y las capturas consecutivas.
- Conservar búsqueda, filtros por stock, condición y ubicación, selección de varias categorías, orden por actividad y paginación. La preferencia lista/cuadrícula debe recordarse.
- Estados actuales: BUENO, REGULAR, MALO, EN REPARACIÓN y RETAZOS. Usar la normalización compartida: MEDIO → REGULAR, OBSOLETO/MAL ESTADO → MALO y RETAL/RETAZOS / BUENO → RETAZOS; no realizar una migración masiva por un cambio visual.
- Conservar navegación e historial del navegador, formularios al cambiar de pestaña, ventanas anidadas y cierre de la capa superior con Retroceder. Los cierres respetan operaciones pendientes.
- Mantener navegación móvil superpuesta, cierre exterior, espacio para la barra inferior y tratamiento del teclado.
- Mostrar el spinner global solo durante el arranque inicial; los cambios de pantalla no deben volver a ocultar la aplicación con él.
- Conservar selección de texto y acceso por teclado en productos clicables; las acciones internas deben seguir siendo independientes.
- Las cantidades permiten escritura manual y decimales, sin flechas nativas internas. Stock inicial usa solo el campo de escritura, sin −/+; los controles de cantidad de otras operaciones mantienen sus botones y límites.
- En móvil, tablet y PC, el alta dispone filas de dos columnas adaptables: prefijo/categoría, unidad de medida/stock inicial, stock mínimo/valor por unidad y unidad del peso/peso. El alta no muestra unidades dañadas/merma; Ubicación es la última sección de datos, antes de Guardar/Cancelar. Valor por unidad no incluye texto auxiliar. La ficha muestra peso y valor antes de ubicación y una fila con Stock y Valor de stock (cantidad total × valor unitario, moneda al final); conserva los cálculos internos de disponibilidad y daños.

## Verificación

- Antes de publicar cambios de la aplicación, ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build` y corregir los fallos relacionados con el cambio.
- **No usar computer use ni automatización de navegador.** La excepción histórica para una prueba de impresión no autoriza nuevas pruebas visuales. La revisión de interfaz corresponde al usuario.
- Las pruebas DOM, unitarias y de PGlite no prueban geometría, movimiento, contraste, rendimiento físico, concurrencia real ni el estado de Supabase en producción. Informar con precisión de lo comprobado y de lo pendiente.

## Git y publicación

- Revisar `git status` antes de preparar commits y seleccionar explícitamente los archivos del cambio. **No usar `git add .`**. Excluir Excel y archivos privados.
- Autorización permanente documentada del usuario, 7 de octubre de 2026: «Sii, has push a cada cambio que hagamos». Crear commit y hacer push a `origin/main` después de cada cambio terminado y verificado, salvo que el usuario modifique esta instrucción.
- El push activa Vercel. Comprobar que el commit llegó a `origin/main`, que Vercel terminó y que la URL pública entrega los recursos actualizados antes de afirmar que el cambio está publicado.
- Repositorio remoto: `https://github.com/Hyperhacker3/inventario-fulgor.git`.
- Aplicación pública: `https://inventario-fulgor.vercel.app/`.
