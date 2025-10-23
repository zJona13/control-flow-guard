-- =========================================================
--  MIGRACIÓN: Separar fecha_hora en fecha y hora
--  Tabla: citas_contingencia
-- =========================================================

-- 1) Agregar las nuevas columnas
ALTER TABLE citas_contingencia 
ADD COLUMN fecha DATE AFTER medico_asignado,
ADD COLUMN hora TIME AFTER fecha;

-- 2) Migrar datos existentes desde fecha_hora
UPDATE citas_contingencia 
SET 
  fecha = DATE(fecha_hora),
  hora = TIME(fecha_hora)
WHERE fecha_hora IS NOT NULL;

-- 3) Hacer las nuevas columnas NOT NULL después de migrar los datos
ALTER TABLE citas_contingencia 
MODIFY COLUMN fecha DATE NOT NULL,
MODIFY COLUMN hora TIME NOT NULL;

-- 4) Eliminar la columna fecha_hora
ALTER TABLE citas_contingencia DROP COLUMN fecha_hora;

-- 5) Actualizar los índices
DROP INDEX idx_citas_fecha_hora ON citas_contingencia;
CREATE INDEX idx_citas_fecha ON citas_contingencia (fecha);
CREATE INDEX idx_citas_hora ON citas_contingencia (hora);

-- 6) Verificar la migración
SELECT 
  id, 
  dni, 
  nombre_completo, 
  fecha, 
  hora, 
  estado 
FROM citas_contingencia 
LIMIT 5;
