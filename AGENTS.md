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
- Ubicaciones nuevas usan ALM/EST/NIV/CAJ con consecutivos globales por tipo, mínimo tres cifras y crecimiento sin recorte. Normalizar las letras/formato de los códigos anteriores conservando TODOS sus números, IDs, padres, nombres y referencias. Los números iguales en padres distintos se conservan; si coinciden en el mismo padre, conservar esos registros y listarlos como pendientes con motivo, aplicando los demás cambios posibles, salvo una excepción explícita por ID y padre autorizada por el usuario. El usuario autorizó que las tres estanterías del conflicto revisado reciban EST001/EST002/EST003, conservando nombres, padres, niveles, cajas y productos; El usuario también autorizó reasignar los 15 BULTO del informe a los siguientes CAJ libres, conservando CAJ001–CAJ015 de las 15 cajas. Calcular esos números sobre el máximo real/reservado al ejecutar, nunca asumir inicio en 016; conservar nombres, IDs, padres y contenidos. No extender estas excepciones a otros registros. Los IDs reales y el SQL combinado permanecen en .private_import/, fuera de Git. Los códigos SIN número (como FULGOR) sí reciben un consecutivo nuevo sobre el máximo existente o reservado, en orden estable por ID, sin cambiar números anteriores ni deduplicar ubicaciones. Leer el número del bloque inicial del código antes de descripciones separadas por espacios (EST-001 SIN ESTANTERÍA → EST001); no tomar números de la descripción. Sincronizar contadores con máximos reales y no reutilizar números eliminados. Bloquear cambios manuales de código en interfaz y Supabase; conservar idempotencia por solicitud. La caja CAJ001 de prueba no se elimina ni se reubica automáticamente.
- La normalización aplica lo posible y lista todos los pendientes con motivo en Supabase; un conflicto de datos no revierte los demás cambios válidos. Conservar los códigos/IDs/contenidos de pendientes, agrupar intercambios dependientes, reservar números sin retroceder y reutilizar propuestas pendientes al reintentar. Mantener la lista y equivalencias privadas con RLS; no publicarlas ni exponerlas al frontend.
- En Administración, las altas de ubicación solo muestran Nombre/Ciudad (almacén), Nombre (estantería y nivel) o Nivel de estantería (caja). No mostrar Código ni Descripción en esas altas, ni Estado al crear caja. Conservar código automático y descripción vacía. No mostrar ni pedir estado de ocupación de caja en ninguna vista, tampoco en edición; conservar el metadato antiguo solo por compatibilidad, sin enviarlo en nuevas escrituras del frontend. Mantener los demás campos de edición.
- Administración permite eliminar almacén, estantería, nivel y caja solo con confirmación y RPC de administración que compruebe en Supabase productos activos/archivados y ubicaciones dependientes. Nunca eliminar en cascada ni cambiar stock, copias históricas o contadores hacia atrás. Conservar errores, bloqueo pendiente, foco, Escape/Retroceder, cierre animado e idempotencia al reintentar.
- Categorías muestra Código (tres letras, único, automático e inmutable), separado del ID interno. Asignar códigos a las categorías existentes conservando nombres, IDs, productos y documentos; incluir categorías usadas que falten en el catálogo. Resolver colisiones en Supabase. Los prefijos de productos conservan su gestión independiente.
- Administración puede corregir Unidad de medida desde edición con el selector compartido de alta. Conservar unidades anteriores, borradores, reintentos y bloqueos; actualizar etiquetas de peso/valor según el borrador. No convertir cantidades, pesos o precios ni reescribir documentos históricos. Solo enviar unidad si cambia y comprobar la activación del permiso específico antes de guardarla.
- Conservar pesos g/kg, valores COP y las copias históricas de cantidades, pesos, precios y empresa en remisiones. Editar la empresa no cambia documentos anteriores; los reintentos conservan la copia original.
- Mantener entradas, salidas, proyectos, historial, remisiones, archivado y desarchivado. La eliminación corresponde únicamente a productos archivados y respeta permisos.
- Conservar dashboard, valores por ubicación, material dañado e inversión por proyecto.
- Mantener fotografías múltiples de productos, con nuevas fotos cuadradas de hasta 1200 × 1200 en WebP y almacenamiento privado. Conservar las fotos existentes sin convertirlas y usar el mismo archivo en tarjetas y detalle, sin generar nuevas miniaturas; el registro fotográfico de salidas sigue separado del PDF y consultable desde el historial.
- Mantener cámaras disponibles según dispositivo: todas en PC y únicamente traseras identificadas en móvil/tablet; conservar la elección de lente y las capturas consecutivas.
- Conservar búsqueda, filtros por stock, condición y ubicación, selección de varias categorías, orden por actividad y paginación. La preferencia lista/cuadrícula debe recordarse.
- Estados actuales: BUENO, REGULAR, MALO, EN REPARACIÓN y RETAZOS. Usar la normalización compartida: MEDIO → REGULAR, OBSOLETO/MAL ESTADO → MALO y RETAL/RETAZOS / BUENO → RETAZOS; no realizar una migración masiva por un cambio visual.
- Conservar navegación e historial del navegador, formularios al cambiar de pestaña, ventanas anidadas y cierre de la capa superior con Retroceder. Los cierres respetan operaciones pendientes.
- Ayuda abre por encima del menú móvil, con títulos en mayúsculas y secciones inicialmente cerradas que se despliegan de forma independiente. Conservar contenido, accesibilidad de botones, foco, Escape/Retroceder y cierre animado. Los eventos de historial sin cambio real de hash no deben cerrar ventanas nuevas.
- Mantener navegación móvil superpuesta, cierre exterior, espacio para la barra inferior y tratamiento del teclado.
- Mostrar el spinner global solo durante el arranque inicial; los cambios de pantalla no deben volver a ocultar la aplicación con él.
- Conservar selección de texto y acceso por teclado en productos clicables; las acciones internas deben seguir siendo independientes.
- Las cantidades permiten escritura manual y decimales, sin flechas nativas internas. Stock inicial usa solo el campo de escritura, sin −/+; los controles de cantidad de otras operaciones mantienen sus botones y límites.
- En móvil, tablet y PC, el alta dispone filas de dos columnas adaptables: prefijo/categoría, unidad de medida/stock inicial, stock mínimo/valor por unidad y unidad del peso/peso. El alta no muestra unidades dañadas/merma; Ubicación es la última sección de datos, antes de Guardar/Cancelar. Valor por unidad no incluye texto auxiliar. La ficha muestra peso y valor antes de ubicación y una fila con Stock y Valor de stock (cantidad total × valor unitario, moneda al final); conserva los cálculos internos de disponibilidad y daños.

- Salidas separa proyecto/fechas, remitente (nombre, cargo y teléfono), destinatario (nombre y teléfono) y transportador/vehículo. Crear proyectos desde Salidas exige ubicación. PDF y tarjetas muestran el destinatario declarado, con cliente histórico como alternativa si no hay receptor; no duplicar Entregar a ni pedir cargo del receptor. La cabecera usa logo a la izquierda, empresa centrada y formato/fecha a la derecha, con código completo debajo a todo el ancho, alineado a la izquierda y fuente de 18 px. Remitente y destinatario tienen contenedores separados. Conservar campos históricos, snapshots y reintentos.

- El código nuevo de remisión toma la ciudad del snapshot del proyecto (ubicacion), nunca el texto de Lugar de destino. Crear/editar proyectos pide solo Ciudad del proyecto. No extraer ni inventar ciudades a partir de direcciones guardadas: se corrigen manualmente antes de nuevas salidas. Mantener códigos y reintentos anteriores; activar la migración de ciudad desde la cuenta del usuario y comprobar disponibilidad antes de emitir.

- En el PDF, Proyecto y salida usa tres columnas, en orden: proyecto/origen/ubicación y destino/fecha de salida/fecha de devolución. Remitente usa dos columnas: entrega/teléfono, con cargo debajo; destinatario conserva su lista. El texto central de empresa se distribuye en al menos 78 px de altura como el logo, con fuente de 13 px y nombre de 14 px, sin añadir líneas de referencia ni recortar datos largos.

- En las tarjetas de Informes, destacar el nombre antes del código. El PDF usa # / CÓDIGO / PRODUCTO / MARCA / CANTIDAD / VALOR UND / PESO UND / UBICACIÓN, en ese orden y con encabezados en mayúsculas. Código y marca tienen columnas propias; no mostrar categoría ni condición/estado en las filas. Mostrar peso por unidad en g/kg o — si falta, sin texto de peso pendiente. Dar el mayor ancho al producto (39 %) y un 9 % a marca, con columnas compactas para código, marca, cantidad, valor y peso. Las filas del PDF mantienen 36 px de altura; Producto, Marca y Ubicación admiten dos líneas de 16 px y el resto una línea, con elipsis al exceder el espacio. Preservar el recorte y las alturas de las celdas al imprimir con reglas específicas que prevalezcan sobre el reset global de overflow/max-height; evitar solapamientos entre columnas. Conservar los datos íntegros en title/copia histórica, el nombre destacado, cálculos y totales/avisos parciales del resumen, sin columnas de peso total o valor de stock por producto.

- Informes es una sección de lectura del inventario (#/reports) para seleccionar productos activos y emitir un PDF de su stock total. Conservar selección/filtros de almacén/estantería/nivel/caja entre páginas y pantallas, con limpieza de dependientes. Guardar cada informe en Supabase antes de abrir el PDF y permitir reabrir su copia inmutable desde un historial paginado compartido por los roles de lectura. Mantener ID y copia en reintentos; no generar documentos sin guardar si falta activar la migración. Consultar datos reales al generar, agrupar cantidades por unidad, indicar pendientes y precios cero, incluir ubicación completa y mantener una copia estable para imprimir. No generar salidas, movimientos ni cambios de stock. Respetar roles de lectura, impedir informes incompletos por productos no disponibles y no truncar selecciones grandes por límites de consulta.

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
