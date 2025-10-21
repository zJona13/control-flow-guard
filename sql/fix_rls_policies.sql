-- Script para arreglar políticas RLS y permisos
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar si RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('perfiles', 'control_excepciones', 'citas_contingencia');

-- 2. Deshabilitar temporalmente RLS para testing (CUIDADO: Solo para desarrollo)
ALTER TABLE public.perfiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_excepciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas_contingencia DISABLE ROW LEVEL SECURITY;

-- 3. Crear políticas más permisivas para desarrollo
-- Políticas para perfiles
DROP POLICY IF EXISTS perfiles_select_self ON public.perfiles;
DROP POLICY IF EXISTS perfiles_update_self ON public.perfiles;
DROP POLICY IF EXISTS perfiles_insert_all ON public.perfiles;

CREATE POLICY perfiles_select_all ON public.perfiles
FOR SELECT USING (true);

CREATE POLICY perfiles_insert_all ON public.perfiles
FOR INSERT WITH CHECK (true);

CREATE POLICY perfiles_update_all ON public.perfiles
FOR UPDATE USING (true);

-- Políticas para control_excepciones
DROP POLICY IF EXISTS excep_select ON public.control_excepciones;
DROP POLICY IF EXISTS excep_insert ON public.control_excepciones;
DROP POLICY IF EXISTS excep_update ON public.control_excepciones;

CREATE POLICY excep_select_all ON public.control_excepciones
FOR SELECT USING (true);

CREATE POLICY excep_insert_all ON public.control_excepciones
FOR INSERT WITH CHECK (true);

CREATE POLICY excep_update_all ON public.control_excepciones
FOR UPDATE USING (true);

-- Políticas para citas_contingencia
DROP POLICY IF EXISTS citas_select ON public.citas_contingencia;
DROP POLICY IF EXISTS citas_insert ON public.citas_contingencia;
DROP POLICY IF EXISTS citas_update ON public.citas_contingencia;

CREATE POLICY citas_select_all ON public.citas_contingencia
FOR SELECT USING (true);

CREATE POLICY citas_insert_all ON public.citas_contingencia
FOR INSERT WITH CHECK (true);

CREATE POLICY citas_update_all ON public.citas_contingencia
FOR UPDATE USING (true);

-- 4. Habilitar RLS nuevamente con las nuevas políticas
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_excepciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas_contingencia ENABLE ROW LEVEL SECURITY;

-- 5. Verificar que las políticas están activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('perfiles', 'control_excepciones', 'citas_contingencia');
