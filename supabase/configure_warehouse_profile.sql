-- Ejecutar completo en el SQL Editor de Supabase con el rol postgres.
-- Configura la cuenta administradora única. Si existen varias, indique
-- el correo de inicio de sesión en v_target_email antes de ejecutar.
BEGIN;
DO $$
DECLARE
  v_target_email text := NULL;
  v_id uuid;
  v_email text;
  v_old_name text;
  v_old_cargo text;
  v_count integer;
  v_aliases text[];
BEGIN
  SELECT count(*) INTO v_count FROM auth.users
    WHERE raw_app_meta_data->>'role' = 'admin'
      AND (v_target_email IS NULL OR lower(email) = lower(v_target_email));
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'No se identificó una única cuenta administradora (% encontradas). Indique su correo en v_target_email y ejecute otra vez.', v_count;
  END IF;
  SELECT id, email, raw_user_meta_data->>'name', raw_user_meta_data->>'cargo'
    INTO v_id, v_email, v_old_name, v_old_cargo FROM auth.users
    WHERE raw_app_meta_data->>'role' = 'admin'
      AND (v_target_email IS NULL OR lower(email) = lower(v_target_email)) FOR UPDATE;
  v_aliases := ARRAY[v_email, v_id::text, nullif(v_old_name, ''), 'Andrés Castañeda'];

  UPDATE auth.users SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('name', 'Andrés Castañeda', 'cargo', 'Almacenista'), updated_at = now()
    WHERE id = v_id;

  -- Conserva autoría por UUID, cantidades, fechas y nombres de otras personas.
  UPDATE public.historial SET responsable = 'Andrés Castañeda'
    WHERE actor_id = v_id AND responsable = ANY(v_aliases);
  UPDATE public.remisiones SET entregado_por = 'Andrés Castañeda',
    cargo_entregado = CASE WHEN cargo_entregado IS NULL OR cargo_entregado IN ('', 'admin', 'Administrador')
      OR cargo_entregado = v_old_cargo THEN 'Almacenista' ELSE cargo_entregado END
    WHERE actor_id = v_id AND entregado_por = ANY(v_aliases);
END $$;
COMMIT;
