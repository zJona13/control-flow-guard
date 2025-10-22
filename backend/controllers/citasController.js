import pool from '../config/database.js';
import { validationResult } from 'express-validator';

// Listar citas
export const getCitas = async (req, res) => {
  try {
    const userRole = req.user.area;

    // Verificar permisos (RLS)
    if (!['ADMISION', 'CLINICO', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'No tiene permisos para ver citas' });
    }

    const [citas] = await pool.query(
      'SELECT * FROM citas_contingencia ORDER BY fecha_hora DESC'
    );

    res.json(citas);
  } catch (error) {
    console.error('Error al obtener citas:', error);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
};

// Crear nueva cita
export const createCita = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { dni, nombre_completo, servicio, medico_asignado, fecha_hora } = req.body;
    const creadoPor = req.user.id;
    const userRole = req.user.area;

    // Verificar permisos
    if (!['ADMISION', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'Solo el personal de admisión puede crear citas' });
    }

    // Validar DNI
    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ error: 'DNI debe tener 8 dígitos' });
    }

    // Validar que la fecha no sea en el pasado
    const fechaCita = new Date(fecha_hora);
    if (fechaCita < new Date()) {
      return res.status(400).json({ error: 'No se pueden programar citas en fechas pasadas' });
    }

    // Convertir fecha ISO a formato MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
    const formatDateForMySQL = (isoString) => {
      const date = new Date(isoString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const fechaHoraMysql = formatDateForMySQL(fecha_hora);

    const [result] = await pool.query(
      'INSERT INTO citas_contingencia (dni, nombre_completo, servicio, medico_asignado, fecha_hora, estado, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dni, nombre_completo, servicio, medico_asignado, fechaHoraMysql, 'PROGRAMADA', creadoPor]
    );

    // Obtener la cita creada
    const [citas] = await pool.query(
      'SELECT * FROM citas_contingencia WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Cita creada exitosamente',
      cita: citas[0]
    });
  } catch (error) {
    console.error('Error al crear cita:', error);
    res.status(500).json({ error: 'Error al crear cita' });
  }
};

// Actualizar estado de cita
export const updateCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const userRole = req.user.area;

    // Verificar permisos
    if (!['ADMISION', 'CLINICO', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'No tiene permisos para actualizar citas' });
    }

    // Verificar que la cita existe
    const [citas] = await pool.query(
      'SELECT * FROM citas_contingencia WHERE id = ?',
      [id]
    );

    if (citas.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }

    // Validar estado
    if (!['PROGRAMADA', 'ATENDIDA', 'CANCELADA'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    await pool.query(
      'UPDATE citas_contingencia SET estado = ? WHERE id = ?',
      [estado, id]
    );

    // Obtener la cita actualizada
    const [updatedCitas] = await pool.query(
      'SELECT * FROM citas_contingencia WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Cita actualizada exitosamente',
      cita: updatedCitas[0]
    });
  } catch (error) {
    console.error('Error al actualizar cita:', error);
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
};

// Exportar citas en formato CSV
export const exportCitas = async (req, res) => {
  try {
    const userRole = req.user.area;

    // Verificar permisos
    if (!['ADMISION', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'No tiene permisos para exportar citas' });
    }

    const [citas] = await pool.query(
      'SELECT * FROM citas_contingencia ORDER BY fecha_hora'
    );

    // Convertir a CSV
    const headers = ['ID', 'DNI', 'Nombre Completo', 'Servicio', 'Médico', 'Fecha y Hora', 'Estado'];
    const rows = citas.map(cita => [
      cita.id,
      cita.dni,
      cita.nombre_completo,
      cita.servicio,
      cita.medico_asignado,
      cita.fecha_hora,
      cita.estado
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=citas_contingencia_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error al exportar citas:', error);
    res.status(500).json({ error: 'Error al exportar citas' });
  }
};

// Obtener citas del día
export const getCitasDelDia = async (req, res) => {
  try {
    const userRole = req.user.area;

    // Verificar permisos
    if (!['ADMISION', 'CLINICO', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'No tiene permisos para ver citas' });
    }

    const [citas] = await pool.query(`
      SELECT * FROM citas_contingencia
      WHERE DATE(fecha_hora) = CURDATE()
      ORDER BY fecha_hora
    `);

    res.json(citas);
  } catch (error) {
    console.error('Error al obtener citas del día:', error);
    res.status(500).json({ error: 'Error al obtener citas del día' });
  }
};

export default { getCitas, createCita, updateCita, exportCitas, getCitasDelDia };

