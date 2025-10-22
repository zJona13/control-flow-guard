import pool from '../config/database.js';
import { validationResult } from 'express-validator';

// Listar excepciones con filtros de rol (RLS)
export const getExcepciones = async (req, res) => {
  try {
    const userRole = req.user.area;
    const userId = req.user.id;

    let query = 'SELECT * FROM control_excepciones';
    let queryParams = [];

    // Filtro RLS según rol
    if (!['TI', 'CONTROL_INTERNO', 'ADMIN'].includes(userRole)) {
      // Si no es TI, CONTROL_INTERNO o ADMIN, solo puede ver sus propias excepciones
      query += ' WHERE creado_por = ? OR responsable_id = ?';
      queryParams = [userId, userId];
    }

    query += ' ORDER BY creado_en DESC';

    const [excepciones] = await pool.query(query, queryParams);
    res.json(excepciones);
  } catch (error) {
    console.error('Error al obtener excepciones:', error);
    res.status(500).json({ error: 'Error al obtener excepciones' });
  }
};

// Crear nueva excepción
export const createExcepcion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { descripcion, categoria, fecha } = req.body;
    const creadoPor = req.user.id;

    // Verificar permisos
    if (!['TI', 'CONTROL_INTERNO', 'ADMIN'].includes(req.user.area)) {
      return res.status(403).json({ error: 'No tiene permisos para crear excepciones' });
    }

    const fechaExcepcion = fecha || new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      'INSERT INTO control_excepciones (descripcion, fecha, categoria, estado, creado_por) VALUES (?, ?, ?, ?, ?)',
      [descripcion, fechaExcepcion, categoria, 'ABIERTO', creadoPor]
    );

    // Obtener la excepción creada
    const [excepciones] = await pool.query(
      'SELECT * FROM control_excepciones WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Excepción creada exitosamente',
      excepcion: excepciones[0]
    });
  } catch (error) {
    console.error('Error al crear excepción:', error);
    res.status(500).json({ error: 'Error al crear excepción' });
  }
};

// Actualizar excepción
export const updateExcepcion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, causa_raiz } = req.body;
    const userId = req.user.id;
    const userRole = req.user.area;

    // Verificar que la excepción existe
    const [excepciones] = await pool.query(
      'SELECT * FROM control_excepciones WHERE id = ?',
      [id]
    );

    if (excepciones.length === 0) {
      return res.status(404).json({ error: 'Excepción no encontrada' });
    }

    const excepcion = excepciones[0];

    // Verificar permisos (RLS)
    const canUpdate = 
      ['TI', 'CONTROL_INTERNO', 'ADMIN'].includes(userRole) ||
      excepcion.responsable_id === userId;

    if (!canUpdate) {
      return res.status(403).json({ error: 'No tiene permisos para actualizar esta excepción' });
    }

    // Actualizar campos permitidos
    const updates = [];
    const params = [];

    if (estado) {
      updates.push('estado = ?');
      params.push(estado);
    }

    if (causa_raiz !== undefined) {
      updates.push('causa_raiz = ?');
      params.push(causa_raiz);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    params.push(id);

    await pool.query(
      `UPDATE control_excepciones SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Si hay cambio de estado, registrar acción
    if (estado) {
      await pool.query(
        'INSERT INTO excepcion_acciones (excepcion_id, autor_id, detalle, nuevo_estado) VALUES (?, ?, ?, ?)',
        [id, userId, `Estado actualizado a ${estado}`, estado]
      );
    }

    // Obtener la excepción actualizada
    const [updatedExcepciones] = await pool.query(
      'SELECT * FROM control_excepciones WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Excepción actualizada exitosamente',
      excepcion: updatedExcepciones[0]
    });
  } catch (error) {
    console.error('Error al actualizar excepción:', error);
    res.status(500).json({ error: 'Error al actualizar excepción' });
  }
};

// Obtener estadísticas para el dashboard
export const getEstadisticas = async (req, res) => {
  try {
    const userRole = req.user.area;
    const userId = req.user.id;

    // Verificar permisos
    if (!['TI', 'CONTROL_INTERNO', 'ADMIN'].includes(userRole)) {
      return res.status(403).json({ error: 'No tiene permisos para ver estadísticas' });
    }

    // Excepciones por estado
    const [porEstado] = await pool.query(`
      SELECT 
        estado,
        COUNT(*) as total
      FROM control_excepciones
      GROUP BY estado
    `);

    // Top 5 categorías
    const [topCategorias] = await pool.query(`
      SELECT 
        categoria,
        COUNT(*) as frecuencia
      FROM control_excepciones
      WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      GROUP BY categoria
      ORDER BY frecuencia DESC
      LIMIT 5
    `);

    // Excepciones recientes
    const [recientes] = await pool.query(`
      SELECT *
      FROM control_excepciones
      ORDER BY creado_en DESC
      LIMIT 10
    `);

    // Excepciones vencidas
    const [vencidas] = await pool.query(`
      SELECT COUNT(*) as total
      FROM control_excepciones
      WHERE estado != 'CERRADO' 
        AND fecha_limite IS NOT NULL 
        AND fecha_limite < CURDATE()
    `);

    res.json({
      porEstado,
      topCategorias,
      recientes,
      vencidas: vencidas[0].total
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

export default { getExcepciones, createExcepcion, updateExcepcion, getEstadisticas };

