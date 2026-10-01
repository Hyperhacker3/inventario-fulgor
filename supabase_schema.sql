-- ==============================================================================
-- ESQUEMA SQL PARA FULGOR S.A.S. - INVENTARIO SOLAR & LOGÍSTICA
-- Compatible con PostgreSQL y Supabase (y lectura directa desde Power BI)
-- ==============================================================================

-- 1. Habilitar extensión UUID (opcional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: ALMACENES / BODEGAS
CREATE TABLE IF NOT EXISTS public.almacenes (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL UNIQUE,
    direccion TEXT,
    capacidad_total INT DEFAULT 1000,
    ocupacion_actual INT DEFAULT 0,
    total_racks INT DEFAULT 0,
    total_items INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: ESTANTERÍAS / RACKS
CREATE TABLE IF NOT EXISTS public.estanterias (
    id TEXT PRIMARY KEY,
    almacen_id TEXT NOT NULL REFERENCES public.almacenes(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL,
    total_cajas INT DEFAULT 0,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: CAJAS / GAVETAS
CREATE TABLE IF NOT EXISTS public.cajas (
    id TEXT PRIMARY KEY,
    estanteria_id TEXT NOT NULL REFERENCES public.estanterias(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT NOT NULL,
    estado TEXT DEFAULT 'PARCIAL', -- 'COMPLETA', 'PARCIAL', 'VACIA'
    capacidad INT DEFAULT 100,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: PROYECTOS SOLARES
CREATE TABLE IF NOT EXISTS public.proyectos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    cliente TEXT NOT NULL,
    ubicacion TEXT,
    fecha_inicio DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: ELEMENTOS / COMPONENTES FOTOVOLTAICOS
CREATE TABLE IF NOT EXISTS public.elementos (
    id TEXT PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE, -- Formato AAA000 ej: PAN550, INV042
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,     -- 'PANELES', 'INVERSORES', 'ESTRUCTURAS', 'CABLES', 'CONECTORES', 'PROTECCIONES'
    cantidad NUMERIC(14,3) NOT NULL DEFAULT 0,
    stock_minimo NUMERIC(14,3) NOT NULL DEFAULT 10,
    unidad TEXT NOT NULL DEFAULT 'UND',
    almacen_id TEXT REFERENCES public.almacenes(id) ON DELETE SET NULL,
    estanteria_id TEXT REFERENCES public.estanterias(id) ON DELETE SET NULL,
    caja_id TEXT REFERENCES public.cajas(id) ON DELETE SET NULL,
    foto_url TEXT,
    descripcion TEXT,
    especificaciones JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: REMISIONES OFICIALES
CREATE TABLE IF NOT EXISTS public.remisiones (
    id TEXT PRIMARY KEY,
    numero_remision TEXT NOT NULL UNIQUE, -- Formato REM-YYYY-XXXX
    fecha TEXT NOT NULL,
    proyecto_id TEXT REFERENCES public.proyectos(id) ON DELETE SET NULL,
    proyecto_nombre TEXT NOT NULL,
    cliente TEXT NOT NULL,
    ubicacion TEXT,
    entregado_por TEXT NOT NULL,
    cargo_entregado TEXT NOT NULL,
    recibido_por TEXT NOT NULL,
    cargo_recibido TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA: HISTORIAL Y TRAZABILIDAD DE MOVIMIENTOS
CREATE TABLE IF NOT EXISTS public.historial (
    id TEXT PRIMARY KEY,
    fecha TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'ENTRADA', 'SALIDA', 'AJUSTE', 'REUBICACION'
    elemento_id TEXT,
    elemento_codigo TEXT NOT NULL,
    elemento_nombre TEXT NOT NULL,
    cantidad NUMERIC(14,3) NOT NULL,
    unidad TEXT NOT NULL,
    origen_ubicacion TEXT,
    destino_ubicacion TEXT,
    responsable TEXT NOT NULL,
    motivo TEXT,
    remision_id TEXT REFERENCES public.remisiones(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PERMISOS ROW LEVEL SECURITY (RLS)
-- Lectura para cuentas autenticadas y escritura administrativa.
ALTER TABLE public.almacenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estanterias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elementos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial ENABLE ROW LEVEL SECURITY;

-- Aplicar supabase/migrations/20261001_secure_inventory.sql inmediatamente
-- después de crear las tablas. Esta fuente inicial no abre acceso público.

-- 10. HABILITAR TIEMPO REAL (REALTIME) PARA ACTUALIZACIONES EN VIVO
ALTER PUBLICATION supabase_realtime ADD TABLE public.elementos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.remisiones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.historial;
ALTER PUBLICATION supabase_realtime ADD TABLE public.almacenes;
