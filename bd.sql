-- Crear enum para roles de usuario (RNF 3.1)
CREATE TYPE public.user_role AS ENUM ('admin_ti', 'control_interno', 'admision', 'personal_clinico');

-- Crear tabla de perfiles de usuario con trigger automático
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles: los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Crear tabla de roles de usuario (separada por seguridad)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS en user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para user_roles: los usuarios pueden ver sus propios roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Permitir que los usuarios se asignen roles durante el registro
CREATE POLICY "Users can insert own roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Función de seguridad para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Función para verificar si el usuario es admin o control interno
CREATE OR REPLACE FUNCTION public.is_ti_or_control()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin_ti', 'control_interno')
  )
$$;

-- Trigger para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role user_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Asignar rol por defecto si se especifica en metadata
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    user_role := (NEW.raw_user_meta_data->>'role')::user_role;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Tabla de excepciones de control (MEA02)
CREATE TABLE public.control_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('backup_failure', 'inappropriate_access', 'config_error', 'policy_violation', 'network_issue')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  responsible_user_id UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  due_date DATE NOT NULL,
  corrective_actions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Habilitar RLS en control_exceptions
ALTER TABLE public.control_exceptions ENABLE ROW LEVEL SECURITY;

-- Solo personal de TI y Control Interno pueden ver excepciones (RNF 3.1)
CREATE POLICY "TI and Control can view exceptions"
  ON public.control_exceptions
  FOR SELECT
  USING (public.is_ti_or_control());

CREATE POLICY "TI and Control can insert exceptions"
  ON public.control_exceptions
  FOR INSERT
  WITH CHECK (public.is_ti_or_control());

CREATE POLICY "TI and Control can update exceptions"
  ON public.control_exceptions
  FOR UPDATE
  USING (public.is_ti_or_control());

-- Trigger para actualizar updated_at
CREATE TRIGGER update_exceptions_updated_at
  BEFORE UPDATE ON public.control_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Tabla de citas de contingencia (DSS04)
CREATE TABLE public.contingency_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_code TEXT NOT NULL UNIQUE,
  dni TEXT NOT NULL,
  full_name TEXT NOT NULL,
  service TEXT NOT NULL,
  doctor TEXT NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_to_main_system BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ
);

-- Habilitar RLS en contingency_appointments
ALTER TABLE public.contingency_appointments ENABLE ROW LEVEL SECURITY;

-- Personal de Admisión puede crear citas de contingencia (RNF 3.1)
CREATE POLICY "Admision can insert appointments"
  ON public.contingency_appointments
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admision') OR 
    public.has_role(auth.uid(), 'admin_ti')
  );

-- Personal clínico y admisión pueden ver citas (RNF 3.3)
CREATE POLICY "Staff can view appointments"
  ON public.contingency_appointments
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admision') OR 
    public.has_role(auth.uid(), 'personal_clinico') OR
    public.has_role(auth.uid(), 'admin_ti')
  );

-- Personal de admisión puede actualizar citas
CREATE POLICY "Admision can update appointments"
  ON public.contingency_appointments
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admision') OR 
    public.has_role(auth.uid(), 'admin_ti')
  );

-- Índices para rendimiento (RNF 1.1)
CREATE INDEX idx_exceptions_status ON public.control_exceptions(status);
CREATE INDEX idx_exceptions_due_date ON public.control_exceptions(due_date);
CREATE INDEX idx_exceptions_created_at ON public.control_exceptions(created_at);
CREATE INDEX idx_appointments_date ON public.contingency_appointments(appointment_date);
CREATE INDEX idx_appointments_created_at ON public.contingency_appointments(created_at);

-- Función para generar código de excepción
CREATE OR REPLACE FUNCTION public.generate_exception_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  new_code TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM public.control_exceptions;
  new_code := 'EXC-' || LPAD(next_num::TEXT, 3, '0');
  RETURN new_code;
END;
$$;

-- Función para generar código de cita
CREATE OR REPLACE FUNCTION public.generate_appointment_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  new_code TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO next_num FROM public.contingency_appointments;
  new_code := 'CONT-' || LPAD(next_num::TEXT, 3, '0');
  RETURN new_code;
END;
$$;