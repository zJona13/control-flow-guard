-- =========================================================
--  ESQUEMA PARA MYSQL - CONTROL FLOW GUARD (AJUSTADO)
-- =========================================================

CREATE DATABASE IF NOT EXISTS control_flow_guard
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE control_flow_guard;

-- 1) Tabla de usuarios
DROP TABLE IF EXISTS usuarios;
CREATE TABLE IF NOT EXISTS usuarios (
  id CHAR(36) PRIMARY KEY,                         -- sin DEFAULT UUID()
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  area ENUM('ADMIN', 'TI', 'CONTROL_INTERNO', 'ADMISION', 'CLINICO') NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_area (area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Parámetros para MEA02
CREATE TABLE IF NOT EXISTS ti_responsables (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  categoria ENUM('FALLA_BACKUP','ACCESO_INAPROPIADO','INCIDENTE_SEGURIDAD','DISPONIBILIDAD','OTRO') NOT NULL UNIQUE,
  responsable_id CHAR(36) NOT NULL,
  sla_dias INT NOT NULL CHECK (sla_dias BETWEEN 1 AND 60),
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) Excepciones de Control (MEA02)
CREATE TABLE IF NOT EXISTS control_excepciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  fecha DATE NOT NULL,
  categoria ENUM('FALLA_BACKUP','ACCESO_INAPROPIADO','INCIDENTE_SEGURIDAD','DISPONIBILIDAD','OTRO') NOT NULL,
  responsable_id CHAR(36),
  fecha_limite DATE,
  estado ENUM('ABIERTO','EN_PROGRESO','CERRADO') NOT NULL DEFAULT 'ABIERTO',
  causa_raiz TEXT,
  creado_por CHAR(36) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (responsable_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_excep_estado (estado),
  INDEX idx_excep_fecha_limite (fecha_limite),
  INDEX idx_excep_categoria (categoria),
  INDEX idx_excep_creado_en (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) Bitácora de acciones correctivas (RF 1.3)
CREATE TABLE IF NOT EXISTS excepcion_acciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  excepcion_id BIGINT NOT NULL,
  autor_id CHAR(36) NOT NULL,
  detalle TEXT NOT NULL,
  nuevo_estado ENUM('ABIERTO','EN_PROGRESO','CERRADO'),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (excepcion_id) REFERENCES control_excepciones(id) ON DELETE CASCADE,
  FOREIGN KEY (autor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_acciones_excepcion (excepcion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5) Citas de contingencia (DSS04)
CREATE TABLE IF NOT EXISTS citas_contingencia (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  dni VARCHAR(8) NOT NULL CHECK (dni REGEXP '^[0-9]{8}$'),
  nombre_completo VARCHAR(200) NOT NULL,
  servicio VARCHAR(100) NOT NULL,
  medico_asignado VARCHAR(100) NOT NULL,
  fecha_hora DATETIME NOT NULL,
  estado ENUM('PROGRAMADA','ATENDIDA','CANCELADA') NOT NULL DEFAULT 'PROGRAMADA',
  creado_por CHAR(36) NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE RESTRICT,
  INDEX idx_citas_fecha_hora (fecha_hora),
  INDEX idx_citas_servicio (servicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6) Exportaciones masivas para post-resumption (RF 2.4)
CREATE TABLE IF NOT EXISTS export_lotes (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  creado_por CHAR(36) NOT NULL,
  descripcion TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cita_exportacion (
  export_id BIGINT NOT NULL,
  cita_id BIGINT NOT NULL,
  PRIMARY KEY (export_id, cita_id),
  FOREIGN KEY (export_id) REFERENCES export_lotes(id) ON DELETE CASCADE,
  FOREIGN KEY (cita_id) REFERENCES citas_contingencia(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7) Vistas para Dashboard
CREATE OR REPLACE VIEW v_excepciones_abiertas AS
SELECT categoria, COUNT(*) AS total
FROM control_excepciones
WHERE estado <> 'CERRADO'
GROUP BY categoria;

CREATE OR REPLACE VIEW v_top5_fallas AS
SELECT categoria, COUNT(*) AS frecuencia
FROM control_excepciones
WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY categoria
ORDER BY frecuencia DESC
LIMIT 5;

CREATE OR REPLACE VIEW v_excepciones_vencidas AS
SELECT id, descripcion, categoria, responsable_id, fecha_limite, estado
FROM control_excepciones
WHERE estado <> 'CERRADO'
  AND fecha_limite IS NOT NULL
  AND fecha_limite < CURDATE();

-- 8) TRIGGERS (usar DELIMITER por BEGIN...END)
DELIMITER $$

-- 8.a) Asignar UUID a usuarios.id si viene NULL
DROP TRIGGER IF EXISTS trg_usuarios_uuid $$
CREATE TRIGGER trg_usuarios_uuid
BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
  IF NEW.id IS NULL OR NEW.id = '' THEN
    SET NEW.id = UUID();
  END IF;
END $$

-- 8.b) Asignación automática de responsable y fecha límite
DROP TRIGGER IF EXISTS trg_asigna_responsable_excepcion $$
CREATE TRIGGER trg_asigna_responsable_excepcion
BEFORE INSERT ON control_excepciones
FOR EACH ROW
BEGIN
  DECLARE v_responsable_id CHAR(36);
  DECLARE v_sla_dias INT;

  SELECT responsable_id, sla_dias
    INTO v_responsable_id, v_sla_dias
  FROM ti_responsables
  WHERE categoria = NEW.categoria
  LIMIT 1;

  IF v_responsable_id IS NOT NULL THEN
    IF NEW.responsable_id IS NULL THEN
      SET NEW.responsable_id = v_responsable_id;
    END IF;

    IF NEW.fecha_limite IS NULL THEN
      SET NEW.fecha_limite = DATE_ADD(NEW.fecha, INTERVAL v_sla_dias DAY);
    END IF;
  END IF;
END $$

DELIMITER ;

-- 9) Comentarios
ALTER TABLE usuarios COMMENT = 'Tabla de usuarios del sistema con autenticación y roles';
ALTER TABLE ti_responsables COMMENT = 'Categoría -> responsable TI + SLA (días)';
ALTER TABLE control_excepciones COMMENT = 'Registro de excepciones de control (MEA02)';
ALTER TABLE excepcion_acciones COMMENT = 'Acciones correctivas y cambios de estado de una excepción';
ALTER TABLE citas_contingencia COMMENT = 'Citas registradas en contingencia (DRP)';