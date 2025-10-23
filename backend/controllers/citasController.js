import pool from '../config/database.js';
import { validationResult } from 'express-validator';

// Listar citas
export const getCitas = async (req, res) => {
  try {
    const userRole = req.user.area;

    // Verificar permisos (RLS)
    if (!['CLINICO', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'No tiene permisos para ver citas' });
    }

    const [citas] = await pool.query(
      'SELECT * FROM citas_contingencia ORDER BY fecha DESC, hora DESC'
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

    const { dni, nombre_completo, servicio, medico_asignado, fecha, hora } = req.body;
    const creadoPor = req.user.id;
    const userRole = req.user.area;

    // Verificar permisos
    if (!['CLINICO', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'Solo el personal clínico y administradores pueden crear citas' });
    }

    // Validar DNI
    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ error: 'DNI debe tener 8 dígitos' });
    }

    // Validar que la fecha no sea en el pasado
    const fechaCita = new Date(`${fecha}T${hora}`);
    if (fechaCita < new Date()) {
      return res.status(400).json({ error: 'No se pueden programar citas en fechas pasadas' });
    }

    // Validar formato de fecha y hora
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    if (!/^\d{2}:\d{2}$/.test(hora)) {
      return res.status(400).json({ error: 'Formato de hora inválido. Use HH:MM' });
    }

    const [result] = await pool.query(
      'INSERT INTO citas_contingencia (dni, nombre_completo, servicio, medico_asignado, fecha, hora, estado, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [dni, nombre_completo, servicio, medico_asignado, fecha, hora, 'PROGRAMADA', creadoPor]
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { estado, fecha, hora } = req.body;
    const userRole = req.user.area;

    // Verificar permisos
    if (!['CLINICO', 'ADMIN'].includes(userRole)) {
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

    // Validar estado si se proporciona
    if (estado && !['PROGRAMADA', 'ATENDIDA', 'CANCELADA'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    // Validar formato de fecha si se proporciona
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
    }

    // Validar formato de hora si se proporciona
    if (hora && !/^\d{2}:\d{2}$/.test(hora)) {
      return res.status(400).json({ error: 'Formato de hora inválido. Use HH:MM' });
    }

    // Actualizar campos proporcionados
    const updates = [];
    const params = [];

    if (estado !== undefined) {
      updates.push('estado = ?');
      params.push(estado);
    }

    if (fecha !== undefined) {
      updates.push('fecha = ?');
      params.push(fecha);
    }

    if (hora !== undefined) {
      updates.push('hora = ?');
      params.push(hora);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron campos para actualizar' });
    }

    params.push(id);
    await pool.query(
      `UPDATE citas_contingencia SET ${updates.join(', ')} WHERE id = ?`,
      params
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
    if (!['CLINICO', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'No tiene permisos para exportar citas' });
    }

    const [citas] = await pool.query(
      'SELECT * FROM citas_contingencia ORDER BY fecha, hora'
    );

    // Convertir a CSV
    const headers = ['ID', 'DNI', 'Nombre Completo', 'Servicio', 'Médico', 'Fecha', 'Hora', 'Estado'];
    const rows = citas.map(cita => [
      cita.id,
      cita.dni,
      cita.nombre_completo,
      cita.servicio,
      cita.medico_asignado,
      cita.fecha,
      cita.hora,
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
    if (!['CLINICO', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'No tiene permisos para ver citas del día' });
    }

    const [citas] = await pool.query(`
      SELECT * FROM citas_contingencia
      WHERE fecha = CURDATE()
      ORDER BY hora
    `);

    res.json(citas);
  } catch (error) {
    console.error('Error al obtener citas del día:', error);
    res.status(500).json({ error: 'Error al obtener citas del día' });
  }
};

export default { getCitas, createCita, updateCita, exportCitas, getCitasDelDia };

