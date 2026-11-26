# Daños por estado y productos para reparar

Actualizado el **26 de noviembre de 2026**, según nueva instrucción del usuario: las unidades dañadas no se cuentan por aparte ni se restan del stock disponible; el estado del material se indica únicamente mediante su etiqueta (`MALO`, `EN REPARACIÓN`, `PARA REPARAR`, `REGULAR`, `RETAZOS`, `BUENO`).

## Regla vigente

- **Sin campo ni conteo separado de unidades dañadas:** se retira el campo **Unidades dañadas** de la edición de producto y la pastilla roja `{n} dañados` de las tarjetas de Inventario. Todos los productos muestran y descuentan su stock de la misma forma (restando únicamente los préstamos internos activos `cantidad_prestada`).
- **Salidas y ajustes normales:** los productos con etiqueta `MALO`, `EN REPARACIÓN` o `PARA REPARAR` muestran su stock completo disponible y admiten salidas externas, salidas internas (temporales o permanentes) y ajustes normales.
- **Indicadores en Inicio y Almacenes:** se conservan *Productos con daños*, *Productos para reparar*, *Valor del material dañado / utilizable / porcentaje* y la columna *Dañado* en existencias por unidad, calculados únicamente a partir de las etiquetas `MALO` (incluidos DAÑADO, OBSOLETO y MAL ESTADO), `EN REPARACIÓN` y `PARA REPARAR`, sin restar esas unidades de *Disponible* ni sumar valores antiguos de `cantidad_danados`.
- Los productos archivados y los conteos pendientes siguen excluidos de existencias disponibles y valores.

## Activación en Supabase

Para permitir también en Supabase las salidas externas, salidas internas y ajustes sobre productos con etiqueta `MALO` / `EN REPARACIÓN` / `PARA REPARAR` o con valores antiguos en `cantidad_danados`, el usuario debe ejecutar completo [20261126000400_allow_damaged_stock_availability.sql](../supabase/migrations/20261126000400_allow_damaged_stock_availability.sql) desde su cuenta, después de `20261106000100_internal_dispatch_types_projects.sql`. No reescribe filas, cantidades, estados ni documentos anteriores; protege los conteos pendientes y los préstamos internos activos.

## Verificación

Pruebas unitarias/DOM y PGlite comprueban la retirada del campo y de la pastilla en tarjetas, disponibilidad igual al stock menos préstamos activos, indicadores de Inicio y Almacenes basados solo en la etiqueta de estado, migración repetible sin alterar filas existentes, y salidas externas/internas/conversiones/ajustes en productos `PARA REPARAR` y `MALO` con valores antiguos de `cantidad_danados`. No se ejecutó SQL en Supabase de producción ni automatización de navegador.
