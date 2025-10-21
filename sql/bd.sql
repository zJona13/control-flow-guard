-- =========================================================
--  ESQUEMA BASE SEGÚN RF/RNF (MEA02 y DSS04) - SUPABASE
-- =========================================================

-- 1) Tipos ENUM para estados y catálogos mínimos
CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'TI', 'CONTROL_INTERNO', 'ADMISION', 'CLINICO');
CREATE TYPE estado_excepcion AS ENUM ('ABIERTO', 'EN_PROGRESO', 'CERRADO');
CREATE TYPE categoria_falla AS ENUM ('FALLA_BACKUP', 'ACCESO_INAPROPIADO', 'INCIDENTE_SEGURIDAD', 'DISPONIBILIDAD', 'OTRO');
CREATE TYPE estado_cita AS ENUM ('PROGRAMADA', 'ATENDIDA', 'CANCELADA');

-- 2) Perfiles vinculados a auth.users (Supabase)
--    Cada usuario tendrá su rol para RLS.
CREATE TABLE public.perfiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombres text NOT NULL,
  apellidos text NOT NULL,
  area rol_usuario NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.perfiles IS 'Perfil de usuario asociado a auth.users con rol para RLS.';

-- 3) Parámetros para MEA02: responsables por categoría + SLA (días)
CREATE TABLE public.ti_responsables (
  id bigserial PRIMARY KEY,
  categoria categoria_falla NOT NULL UNIQUE,
  responsable_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
  sla_dias integer NOT NULL CHECK (sla_dias BETWEEN 1 AND 60),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ti_responsables IS 'Tabla de ruteo: categoría -> responsable TI + SLA (días).';

-- 4) Excepciones de Control (MEA02)
CREATE TABLE public.control_excepciones (
  id bigserial PRIMARY KEY,
  descripcion text NOT NULL,
  fecha date NOT NULL, -- fecha en la que se detecta la excepción
  categoria categoria_falla NOT NULL,
  responsable_id uuid REFERENCES public.perfiles(id) ON DELETE SET NULL, -- se autocompleta por trigger
  fecha_limite date, -- se autocompleta por trigger (fecha + sla_dias)
  estado estado_excepcion NOT NULL DEFAULT 'ABIERTO',
  causa_raiz text,                                 -- campo libre; top 5 se obtiene por vista
  creado_por uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.control_excepciones IS 'Registro de excepciones de control (MEA02).';

-- Índices de performance (RNF 1.1 y 1.2)
CREATE INDEX idx_excep_estado ON public.control_excepciones (estado);
CREATE INDEX idx_excep_fecha_limite ON public.control_excepciones (fecha_limite);
CREATE INDEX idx_excep_categoria ON public.control_excepciones (categoria);
CREATE INDEX idx_excep_creado_en ON public.control_excepciones (creado_en);

-- 4.1) Bitácora de acciones correctivas (RF 1.3)
CREATE TABLE public.excepcion_acciones (
  id bigserial PRIMARY KEY,
  excepcion_id bigint NOT NULL REFERENCES public.control_excepciones(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
  detalle text NOT NULL,                     -- pasos realizados
  nuevo_estado estado_excepcion,             -- si cambió de estado con esta acción
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_acciones_excepcion ON public.excepcion_acciones (excepcion_id);

COMMENT ON TABLE public.excepcion_acciones IS 'Pasos/acciones correctivas y cambios de estado asociados a una excepción (MEA02).';

-- 5) Citas de contingencia (DSS04)
CREATE TABLE public.citas_contingencia (
  id bigserial PRIMARY KEY,
  dni varchar(8) NOT NULL CHECK (dni ~ '^[0-9]{8}$'),
  nombre_completo text NOT NULL,
  servicio text NOT NULL,
  medico_asignado text NOT NULL,
  fecha_hora timestamptz NOT NULL,
  estado estado_cita NOT NULL DEFAULT 'PROGRAMADA',
  creado_por uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Índices de performance en consultas típicas
CREATE INDEX idx_citas_fecha_hora ON public.citas_contingencia (fecha_hora);
CREATE INDEX idx_citas_servicio ON public.citas_contingencia (servicio);

COMMENT ON TABLE public.citas_contingencia IS 'Citas registradas en modo contingencia (DRP activo) para continuidad operacional (DSS04).';

-- 5.1) Exportaciones masivas para post-resumption (RF 2.4)
CREATE TABLE public.export_lotes (
  id bigserial PRIMARY KEY,
  creado_por uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE RESTRICT,
  descripcion text,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cita_exportacion (
  export_id bigint NOT NULL REFERENCES public.export_lotes(id) ON DELETE CASCADE,
  cita_id bigint NOT NULL REFERENCES public.citas_contingencia(id) ON DELETE CASCADE,
  PRIMARY KEY (export_id, cita_id)
);

COMMENT ON TABLE public.export_lotes IS 'Lotes de exportación de citas de contingencia para ingreso posterior al sistema principal.';
COMMENT ON TABLE public.cita_exportacion IS 'Relación N:M entre lotes de exportación y citas.';

-- 6) Vistas para Dashboard (RF 1.5)
-- 6.1) Excepciones abiertas
create view public.v_excepciones_abiertas with (security_invoker = on) as
 SELECT categoria,
    count(*) AS total
   FROM control_excepciones
  WHERE estado <> 'CERRADO'::estado_excepcion
  GROUP BY categoria;

-- 6.2) Tiempo promedio de resolución (solo excepciones cerradas)
create view public.v_tiempo_prom_resolucion with (security_invoker = on) as
 SELECT avg(ea.max_cierre - ce.creado_en) AS promedio_cierre
   FROM control_excepciones ce
     JOIN LATERAL ( SELECT max(a.creado_en) AS max_cierre
           FROM excepcion_acciones a
          WHERE a.excepcion_id = ce.id AND a.nuevo_estado = 'CERRADO'::estado_excepcion) ea ON true
  WHERE ce.estado = 'CERRADO'::estado_excepcion;

-- 6.3) Top 5 tipos de fallas por frecuencia (últimos 90 días)
create view public.v_top5_fallas with (security_invoker = on) as
 SELECT categoria,
    count(*) AS frecuencia
   FROM control_excepciones
  WHERE creado_en >= (now() - '90 days'::interval)
  GROUP BY categoria
  ORDER BY (count(*)) DESC
 LIMIT 5;

-- 7) Alertas (RF 1.4): Excepciones vencidas
create view public.v_excepciones_vencidas with (security_invoker = on) as
 SELECT id,
    descripcion,
    categoria,
    responsable_id,
    fecha_limite,
    estado
   FROM control_excepciones
  WHERE estado <> 'CERRADO'::estado_excepcion AND fecha_limite IS NOT NULL AND fecha_limite < CURRENT_DATE;

-- 8) Triggers de mantenimiento de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END$$;

CREATE TRIGGER t_upd_excepciones
BEFORE UPDATE ON public.control_excepciones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER t_upd_citas
BEFORE UPDATE ON public.citas_contingencia
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9) Trigger: asignación automática de responsable y fecha límite (RF 1.2)
CREATE OR REPLACE FUNCTION public.autoruta_responsable_excepcion()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  r record;
BEGIN
  SELECT responsable_id, sla_dias INTO r
  FROM public.ti_responsables
  WHERE categoria = NEW.categoria;

  IF r.responsable_id IS NOT NULL THEN
    NEW.responsable_id := COALESCE(NEW.responsable_id, r.responsable_id);
    IF NEW.fecha_limite IS NULL THEN
      NEW.fecha_limite := NEW.fecha + make_interval(days => r.sla_dias);
    END IF;
  END IF;

  RETURN NEW;
END$$;

CREATE TRIGGER t_asigna_responsable_excepcion
BEFORE INSERT ON public.control_excepciones
FOR EACH ROW EXECUTE FUNCTION public.autoruta_responsable_excepcion();

-- 10) (Opcional) Límites de prototipo (RNF 1.2)
--     Bloquea inserts al superar 500 excepciones y 1000 citas.
CREATE OR REPLACE FUNCTION public.enforce_prototype_caps()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  total_ex bigint;
  total_citas bigint;
BEGIN
  IF TG_TABLE_NAME = 'control_excepciones' THEN
    SELECT count(*) INTO total_ex FROM public.control_excepciones;
    IF total_ex >= 500 THEN
      RAISE EXCEPTION 'Límite de prototipo alcanzado (500 excepciones).';
    END IF;
  ELSIF TG_TABLE_NAME = 'citas_contingencia' THEN
    SELECT count(*) INTO total_citas FROM public.citas_contingencia;
    IF total_citas >= 1000 THEN
      RAISE EXCEPTION 'Límite de prototipo alcanzado (1000 citas).';
    END IF;
  END IF;
  RETURN NEW;
END$$;

CREATE TRIGGER t_cap_excepciones
BEFORE INSERT ON public.control_excepciones
FOR EACH ROW EXECUTE FUNCTION public.enforce_prototype_caps();

CREATE TRIGGER t_cap_citas
BEFORE INSERT ON public.citas_contingencia
FOR EACH ROW EXECUTE FUNCTION public.enforce_prototype_caps();

-- 11) Row Level Security (RNF 3.1, 3.3)
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_excepciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excepcion_acciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas_contingencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cita_exportacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ti_responsables ENABLE ROW LEVEL SECURITY;

-- Helper: función para obtener el área del usuario autenticado
CREATE OR REPLACE FUNCTION public.mi_area()
RETURNS rol_usuario LANGUAGE sql STABLE AS $$
  SELECT area FROM public.perfiles WHERE id = auth.uid()
$$;

-- Políticas:
-- perfiles: cada quien ve/edita solo su perfil; ADMIN puede ver todos (ajústalo si no usas ADMIN)
CREATE POLICY perfiles_select_self ON public.perfiles
FOR SELECT USING (id = auth.uid() OR public.mi_area() = 'ADMIN');
CREATE POLICY perfiles_update_self ON public.perfiles
FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ti_responsables: visible y editable solo por TI y CONTROL_INTERNO (y ADMIN)
CREATE POLICY tir_select ON public.ti_responsables
FOR SELECT USING (public.mi_area() IN ('TI','CONTROL_INTERNO','ADMIN'));
CREATE POLICY tir_modify ON public.ti_responsables
FOR INSERT WITH CHECK (public.mi_area() IN ('TI','CONTROL_INTERNO','ADMIN'));
CREATE POLICY tir_update ON public.ti_responsables
FOR UPDATE USING (public.mi_area() IN ('TI','CONTROL_INTERNO','ADMIN'))
WITH CHECK (public.mi_area() IN ('TI','CONTROL_INTERNO','ADMIN'));

-- control_excepciones: visible para TI y CONTROL_INTERNO; crea quien tenga TI/CONTROL_INTERNO
CREATE POLICY excep_select ON public.control_excepciones
FOR SELECT USING (public.mi_area() IN ('TI','CONTROL_INTERNO','ADMIN'));
CREATE POLICY excep_insert ON public.control_excepciones
FOR INSERT WITH CHECK (public.mi_area() IN ('TI','CONTROL_INTERNO','ADMIN'));
-- Actualizar: el responsable asignado o TI/CONTROL_INTERNO
CREATE POLICY excep_update ON public.control_excepciones
FOR UPDATE USING (
  public.mi_area() IN ('TI','CONTROL_INTERNO','ADMIN')
  OR auth.uid() = responsable_id
)
WITH CHECK (
  public.mi_area() IN ('TI','CONTROL_INTERNO','ADMIN')
  OR auth.uid() = responsable_id
);

-- excepcion_acciones: leer si puedes ver la excepción; insertar si eres TI/CONTROL_INTERNO o responsable
CREATE POLICY acc_select ON public.excepcion_acciones
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.control_excepciones ce
    WHERE ce.id = excepcion_id
      AND (public.mi_area() IN ('TI','CONTROL_INTERNO','ADMIN')
           OR auth.uid() = ce.responsable_id)
  )
);
CREATE POLICY acc_insert ON public.excepcion_acciones
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.control_excepciones ce
    WHERE ce.id = excepcion_id
      AND (public.mi_area() IN ('TI','CONTROL_INTERNO','ADMIN')
           OR auth.uid() = ce.responsable_id)
  )
);

-- citas_contingencia: visible para ADMISION y CLINICO (y ADMIN); inserta Admisión
CREATE POLICY citas_select ON public.citas_contingencia
FOR SELECT USING (public.mi_area() IN ('ADMISION','CLINICO','ADMIN'));
CREATE POLICY citas_insert ON public.citas_contingencia
FOR INSERT WITH CHECK (public.mi_area() IN ('ADMISION','ADMIN'));
-- Actualizar: Admisión y Clínico pueden actualizar estado/errores operativos
CREATE POLICY citas_update ON public.citas_contingencia
FOR UPDATE USING (public.mi_area() IN ('ADMISION','CLINICO','ADMIN'))
WITH CHECK (public.mi_area() IN ('ADMISION','CLINICO','ADMIN'));

-- export_lotes y cita_exportacion: Admisión (o ADMIN)
CREATE POLICY exp_select ON public.export_lotes
FOR SELECT USING (public.mi_area() IN ('ADMISION','ADMIN'));
CREATE POLICY exp_ins ON public.export_lotes
FOR INSERT WITH CHECK (public.mi_area() IN ('ADMISION','ADMIN'));

CREATE POLICY exprel_select ON public.cita_exportacion
FOR SELECT USING (public.mi_area() IN ('ADMISION','ADMIN'));
CREATE POLICY exprel_ins ON public.cita_exportacion
FOR INSERT WITH CHECK (public.mi_area() IN ('ADMISION','ADMIN'));

-- 12) Comentarios (usabilidad/terminología EsSalud, RNF 2.2)
COMMENT ON COLUMN public.citas_contingencia.dni IS 'Documento Nacional de Identidad (8 dígitos).';
COMMENT ON COLUMN public.citas_contingencia.servicio IS 'Servicio/Especialidad (ej. Tópico, Consultorio).';
COMMENT ON COLUMN public.citas_contingencia.medico_asignado IS 'Nombre del médico asignado.';

-- 13) Semillas mínimas (opcional): crea responsables y SLA por categoría
-- NOTA: reemplaza los UUID por los de usuarios reales de tu proyecto.
-- INSERT INTO public.perfiles (id, nombres, apellidos, area) VALUES
--   ('00000000-0000-0000-0000-000000000001','Ana','TI','TI'),
--   ('00000000-0000-0000-0000-000000000002','Bruno','Control','CONTROL_INTERNO'),
--   ('00000000-0000-0000-0000-000000000003','Carmen','Admision','ADMISION'),
--   ('00000000-0000-0000-0000-000000000004','Dario','Clinico','CLINICO');

-- INSERT INTO public.ti_responsables (categoria, responsable_id, sla_dias) VALUES
--   ('FALLA_BACKUP','00000000-0000-0000-0000-000000000001',3),
--   ('ACCESO_INAPROPIADO','00000000-0000-0000-0000-000000000001',7),
--   ('INCIDENTE_SEGURIDAD','00000000-0000-0000-0000-000000000001',2),
--   ('DISPONIBILIDAD','00000000-0000-0000-0000-000000000001',1),
--   ('OTRO','00000000-0000-0000-0000-000000000001',5);