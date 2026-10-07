-- Datos compartidos de empresa y copia inmutable en cada remisión nueva.
-- Ejecutar el archivo completo. No cambia productos, existencias ni partidas.
BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_inventory_company(p_profile jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_key text; v_name text; v_nit text; v_address text; v_phone text; v_logo text;
BEGIN
  IF p_profile IS NULL OR jsonb_typeof(p_profile) <> 'object' THEN RAISE EXCEPTION 'Datos de empresa inválidos'; END IF;
  FOREACH v_key IN ARRAY ARRAY['nombre','nit','direccion','telefono','logo'] LOOP
    IF jsonb_typeof(p_profile->v_key) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Datos de empresa inválidos'; END IF;
  END LOOP;
  v_name := trim(regexp_replace(p_profile->>'nombre','\s+',' ','g'));
  v_nit := trim(regexp_replace(p_profile->>'nit','\s+',' ','g'));
  v_address := trim(regexp_replace(p_profile->>'direccion','\s+',' ','g'));
  v_phone := trim(regexp_replace(p_profile->>'telefono','\s+',' ','g'));
  v_logo := p_profile->>'logo';
  IF length(v_name) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Escriba un nombre de empresa de hasta 120 caracteres'; END IF;
  IF v_nit !~ '^[0-9][0-9 .-]{2,29}$' THEN RAISE EXCEPTION 'NIT inválido'; END IF;
  IF length(v_address) > 240 OR length(v_phone) > 60 THEN RAISE EXCEPTION 'Dirección o teléfono demasiado largos'; END IF;
  IF v_logo <> '/logo-completo.png' AND (length(v_logo) > 160000 OR v_logo !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$') THEN
    RAISE EXCEPTION 'Suba un logo PNG, JPG o WebP';
  END IF;
  RETURN jsonb_build_object('nombre',v_name,'nit',v_nit,'direccion',v_address,'telefono',v_phone,'logo',v_logo);
END $$;

CREATE TABLE IF NOT EXISTS public.inventario_empresa (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  perfil jsonb NOT NULL CHECK (perfil = public.normalize_inventory_company(perfil)),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid
);
INSERT INTO public.inventario_empresa(singleton,perfil) VALUES(true,
  '{"nombre":"EL TURPIAL","nit":"800.176.581","direccion":"","telefono":"","logo":"/logo-completo.png"}'::jsonb)
ON CONFLICT(singleton) DO NOTHING;
ALTER TABLE public.inventario_empresa ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventario_empresa FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.inventory_company_profile() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF coalesce(public.fulgor_role(),'') NOT IN ('admin','operador','consulta') THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN (SELECT jsonb_build_object('perfil',perfil,'version',version) FROM public.inventario_empresa WHERE singleton);
END $$;

CREATE OR REPLACE FUNCTION public.save_inventory_company_profile(p_profile jsonb,p_version integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_profile jsonb;
BEGIN
  IF NOT coalesce(public.fulgor_is_admin(),false) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  v_profile := public.normalize_inventory_company(p_profile);
  UPDATE public.inventario_empresa SET perfil=v_profile,version=version+1,updated_at=now(),updated_by=auth.uid()
    WHERE singleton AND version=p_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'Los datos de empresa cambiaron. Actualice la sección y revise sus cambios antes de guardar'; END IF;
  RETURN public.inventory_company_profile();
END $$;

-- Los documentos anteriores conservan los datos aprobados al introducir esta función.
ALTER TABLE public.remisiones ADD COLUMN IF NOT EXISTS empresa jsonb NOT NULL DEFAULT
  '{"nombre":"EL TURPIAL","nit":"800.176.581","direccion":"","telefono":"","logo":"/logo-completo.png"}'::jsonb;

CREATE OR REPLACE FUNCTION public.snapshot_remission_company() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.empresa IS DISTINCT FROM OLD.empresa THEN RAISE EXCEPTION 'La empresa de una remisión emitida no se puede modificar'; END IF;
  ELSE
    SELECT perfil INTO NEW.empresa FROM public.inventario_empresa WHERE singleton FOR SHARE;
    IF NEW.empresa IS NULL THEN RAISE EXCEPTION 'No se pudo obtener la empresa para emitir la remisión'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS remission_company_snapshot ON public.remisiones;
CREATE TRIGGER remission_company_snapshot BEFORE INSERT OR UPDATE ON public.remisiones
FOR EACH ROW EXECUTE FUNCTION public.snapshot_remission_company();

REVOKE ALL ON FUNCTION public.normalize_inventory_company(jsonb), public.snapshot_remission_company(),
  public.inventory_company_profile(), public.save_inventory_company_profile(jsonb,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_company_profile(), public.save_inventory_company_profile(jsonb,integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
