-- Script para verificar configuración de autenticación en Supabase
-- Ejecutar en el SQL Editor de Supabase

-- 1. Verificar usuarios existentes (esto debería funcionar)
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar perfiles creados
SELECT 
    id,
    nombres,
    apellidos,
    area,
    creado_en
FROM public.perfiles
ORDER BY creado_en DESC
LIMIT 10;

-- 3. Verificar configuración de RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('perfiles', 'control_excepciones', 'citas_contingencia');

-- 4. Verificar políticas RLS existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('perfiles', 'control_excepciones', 'citas_contingencia');

-- 5. Verificar que las tablas existen y tienen datos
SELECT 
    'perfiles' as tabla,
    COUNT(*) as registros
FROM public.perfiles
UNION ALL
SELECT 
    'control_excepciones' as tabla,
    COUNT(*) as registros
FROM public.control_excepciones
UNION ALL
SELECT 
    'citas_contingencia' as tabla,
    COUNT(*) as registros
FROM public.citas_contingencia;
